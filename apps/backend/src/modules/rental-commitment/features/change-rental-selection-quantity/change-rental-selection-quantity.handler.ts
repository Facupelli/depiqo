import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';
import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';
import {
  PricingCalculation,
  PricingCalculationError,
} from 'src/modules/pricing/public-api/pricing-calculation.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantBillingPreferences } from 'src/modules/tenant-management/public-api/tenant-billing-preferences.public-api';
import { adaptPricingCalculationToSnapshot } from '../../application/accepted-pricing/adapt-pricing-calculation-to-snapshot';
import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import {
  InsufficientAssetAvailabilityError,
  RentalCannotBeEditedFromStatusError,
  RentalInvalidFieldError,
  RentalPeriodHasEndedError,
  RentalSelectionNotFoundError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalStatus } from '../../domain/rental-status';
import { Rental } from '../../domain/rental.aggregate';
import { AssetId } from '../../domain/types/rental-commitment-ids';
import { JsonValue } from '../../domain/value-objects/json-snapshot.value-object';
import { AcceptedRentalPricingSnapshotV1 } from '../../domain/value-objects/accepted-pricing-snapshot.type';
import { getConfirmedPriceSnapshotForOwnerSplits } from '../../owner-split/confirmed-price-snapshot-for-owner-splits';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalRepository } from '../../persistence/rental.repository';
import { ChangeRentalSelectionQuantityCommand } from './change-rental-selection-quantity.command';
import {
  ChangeRentalSelectionQuantityError,
  changeRentalSelectionQuantityError,
} from './change-rental-selection-quantity.errors';

export type ChangeRentalSelectionQuantityResult = Result<
  { rentalId: string; version: number; updatedAt: Date },
  ChangeRentalSelectionQuantityError
>;

@CommandHandler(ChangeRentalSelectionQuantityCommand)
export class ChangeRentalSelectionQuantityHandler implements ICommandHandler<
  ChangeRentalSelectionQuantityCommand,
  ChangeRentalSelectionQuantityResult
> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly billing: TenantBillingPreferences,
    private readonly branches: BranchFacts,
    private readonly pricing: PricingCalculation,
    private readonly allocation: RentalAssetAllocationService,
    private readonly splitCalculator: RentalOwnerSplitCalculator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: ChangeRentalSelectionQuantityCommand): Promise<ChangeRentalSelectionQuantityResult> {
    const { tenantId, tenantUserId, rentalId, selectionId, quantity, releaseAssetIds } = command.props;
    const context = { useCase: 'ChangeRentalSelectionQuantity', tenantId, tenantUserId, rentalId, selectionId };
    const rental = await this.rentalRepository.findById(tenantId, rentalId);
    if (!rental)
      return err(this.error('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`, context));
    const initialSelection = rental.selections.find((selection) => selection.id === selectionId);
    if (!initialSelection) return err(this.map(new RentalSelectionNotFoundError(rentalId, selectionId), context));
    if (rental.status !== RentalStatus.Confirmed)
      return err(this.map(new RentalCannotBeEditedFromStatusError(rentalId, rental.status), context));

    let preparedPrice: JsonValue | undefined;
    if (quantity !== initialSelection.quantity) {
      const [billing, branch] = await Promise.all([
        this.billing.getTenantBillingPreferences({ tenantId }),
        this.branches.getBranchFacts({ tenantId, branchId: rental.branchId }),
      ]);
      if (billing.isErr() || branch.isErr())
        return err(
          this.error('rental_commitment.invalid_pricing_input', 'Rental pricing facts are unavailable.', context),
        );
      const previous = rental.confirmedPriceSnapshot!.toJSON() as AcceptedRentalPricingSnapshotV1;
      const previousLine = new Map(previous.final.lines.map((line) => [line.rentalSelectionId, line]));
      const calculated = await this.pricing.calculateProposedPrice({
        tenantId,
        customerId: rental.rentalCustomerId!,
        rentalPeriod: { start: rental.period.start, end: rental.period.end },
        calculationFacts: {
          effectiveTimezone: branch.value.effectiveTimezone,
          dailyBillingPolicy: billing.value.dailyBillingPolicy,
          weekendCountsAsOne: billing.value.weekendCountsAsOne,
        },
        lines: rental.selections.map((selection) => ({
          lineReference: selection.id,
          rentalOfferId: selection.rentalOfferId,
          rentableItemId: selection.rentableItemId,
          categoryId: previousLine.get(selection.id)?.categoryId,
          quantity: selection.id === selectionId ? quantity : selection.quantity,
        })),
      });
      if (calculated.isErr()) return err(this.map(calculated.error, context));
      preparedPrice = adaptPricingCalculationToSnapshot({
        result: calculated.value,
        context: 'CONFIRMED',
        lineDisplayNames: Object.fromEntries(
          rental.selections.map((selection) => [selection.id, selection.rentableItemNameSnapshot]),
        ),
      });
    }

    try {
      return await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        const current = await this.rentalRepository.findById(tenantId, rentalId, tx);
        if (!current)
          return err(this.error('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`, context));
        if (current.version !== command.props.expectedVersion)
          return err(
            this.error(
              'rental_commitment.rental_version_conflict',
              `Rental "${rentalId}" was modified by another request.`,
              context,
            ),
          );
        const selection = current.selections.find((candidate) => candidate.id === selectionId);
        if (!selection) return err(this.map(new RentalSelectionNotFoundError(rentalId, selectionId), context));
        if (current.status !== RentalStatus.Confirmed)
          return err(this.map(new RentalCannotBeEditedFromStatusError(rentalId, current.status), context));
        if (quantity === selection.quantity) {
          if (releaseAssetIds.length > 0)
            return err(
              this.map(
                new RentalInvalidFieldError('releaseAssetIds', 'must be empty when quantity is unchanged'),
                context,
              ),
            );
          return ok({ rentalId, version: current.version, updatedAt: current.updatedAt! });
        }
        if (!preparedPrice) throw new Error('Prepared pricing facts are missing for a quantity mutation.');
        const operationTime = new Date();
        const effectiveAt = operationTime < current.period.start ? current.period.start : operationTime;
        if (effectiveAt >= current.period.end) return err(this.map(new RentalPeriodHasEndedError(rentalId), context));

        const targetLines = current.demandLines.filter((line) => line.rentalSelectionId === selection.id);
        if (targetLines.length === 0) {
          return err(
            this.map(
              new RentalInvalidFieldError('demandLines', 'target selection must have persisted demand'),
              context,
            ),
          );
        }
        let newAssignments: Parameters<Rental['changeConfirmedSelectionQuantity']>[0]['newAssignments'] = [];
        if (quantity > selection.quantity) {
          if (releaseAssetIds.length > 0)
            return err(
              this.map(
                new RentalInvalidFieldError('releaseAssetIds', 'must be empty when increasing quantity'),
                context,
              ),
            );
          const deltaLines = [];
          for (const line of targetLines) {
            if (selection.quantity <= 0 || line.quantity <= 0 || line.quantity % selection.quantity !== 0)
              return err(
                this.map(
                  new RentalInvalidFieldError('demandLines', 'persisted demand is not divisible by selection quantity'),
                  context,
                ),
              );
            const multiplier = line.quantity / selection.quantity;
            if (!Number.isInteger(multiplier) || multiplier <= 0)
              return err(
                this.map(
                  new RentalInvalidFieldError('demandLines', 'derived quantity-per-item must be a positive integer'),
                  context,
                ),
              );
            deltaLines.push({
              rentalDemandLineId: line.id,
              rentalSelectionId: line.rentalSelectionId,
              equipmentTypeId: line.equipmentTypeId,
              quantity: (quantity - selection.quantity) * multiplier,
            });
          }
          const plan = await this.allocation.planAllocations({
            tenantId,
            branchId: current.branchId,
            periodStart: effectiveAt,
            periodEnd: current.period.end,
            demandLines: deltaLines,
            excludeAssetIds: current.currentAssignedAssets.map((assignment) => assignment.assetId),
            tx,
          });
          if (plan.isErr()) return err(this.map(plan.error, context));
          newAssignments = plan.value.allocations.map((item) => ({
            rentalDemandLineId: item.rentalDemandLineId,
            assetId: item.assetId,
            ownershipSnapshot: item.ownershipSnapshot,
          }));
        }
        const changed = current.changeConfirmedSelectionQuantity({
          selectionId,
          newQuantity: quantity,
          releaseAssetIds: releaseAssetIds as AssetId[],
          newAssignments,
          confirmedPriceSnapshot: preparedPrice,
          operationTime,
        });
        if (changed.isErr()) return err(this.map(changed.error, context));
        const snapshot = getConfirmedPriceSnapshotForOwnerSplits(current.confirmedPriceSnapshot);
        const ownerSplits = this.splitCalculator.calculate({
          tenantId,
          rentalId,
          currency: snapshot.currency,
          selections: current.selections.map(({ id }) => ({ id })),
          demandLines: current.demandLines.map((line) => ({ id: line.id, sourceSelectionId: line.rentalSelectionId })),
          fulfilledAssets: current.currentAssignedAssets.map((assignment) => ({
            id: assignment.id,
            rentalDemandLineId: assignment.rentalDemandLineId,
            assetId: assignment.assetId,
            ownershipSnapshot: assignment.ownershipSnapshot.toJSON(),
          })),
          priceLines: snapshot.lines.map((line) => ({
            rentalSelectionId: line.rentalSelectionId,
            netAmount: line.total,
          })),
        }).splits;
        const saved = await this.rentalRepository.save(current, {
          expectedVersion: command.props.expectedVersion,
          ownerSplits,
          tx,
        });
        if (!saved)
          return err(
            this.error(
              'rental_commitment.rental_version_conflict',
              `Rental "${rentalId}" was modified by another request.`,
              context,
            ),
          );
        integrationEvents.collect(toRentalIntegrationEvents(current.pullDomainEvents()));
        return ok({ rentalId, version: saved.version, updatedAt: saved.updatedAt });
      });
    } catch (error) {
      if (error instanceof PostgresExclusionViolationError)
        return err(
          this.error(
            'rental_commitment.insufficient_asset_availability',
            'The required equipment is no longer available.',
            context,
            error,
          ),
        );
      throw error;
    }
  }

  private error(
    code: ChangeRentalSelectionQuantityError['code'],
    message: string,
    context: Record<string, unknown>,
    cause?: unknown,
  ) {
    return changeRentalSelectionQuantityError(code, message, cause, context);
  }
  private map(error: unknown, context: Record<string, unknown>): ChangeRentalSelectionQuantityError {
    if (error instanceof RentalSelectionNotFoundError)
      return this.error('rental_commitment.rental_selection_not_found', error.message, context, error);
    if (error instanceof RentalCannotBeEditedFromStatusError)
      return this.error('rental_commitment.rental_cannot_be_edited_from_status', error.message, context, error);
    if (error instanceof RentalPeriodHasEndedError)
      return this.error('rental_commitment.rental_period_ended', error.message, context, error);
    if (error instanceof InsufficientAssetAvailabilityError)
      return this.error('rental_commitment.insufficient_asset_availability', error.message, context, error);
    if (
      error instanceof PricingCalculationError ||
      (error instanceof Error && 'code' in error && error.code === 'INVALID_PRICING_INPUT')
    )
      return this.error('rental_commitment.invalid_pricing_input', error.message, context, error);
    if (error instanceof RentalInvalidFieldError)
      return this.error('rental_commitment.invalid_rental_field', error.message, context, error);
    throw error;
  }
}
