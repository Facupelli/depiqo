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
  RentalPeriodCannotStartInPastError,
  RentalPeriodHasEndedError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalStatus } from '../../domain/rental-status';
import { Rental } from '../../domain/rental.aggregate';
import { AssetId } from '../../domain/types/rental-commitment-ids';
import { JsonValue } from '../../domain/value-objects/json-snapshot.value-object';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { getConfirmedPriceSnapshotForOwnerSplits } from '../../owner-split/confirmed-price-snapshot-for-owner-splits';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalRepository } from '../../persistence/rental.repository';
import { ChangeRentalPeriodCommand } from './change-rental-period.command';
import { ChangeRentalPeriodError, changeRentalPeriodError } from './change-rental-period.errors';

export type ChangeRentalPeriodResult = Result<
  { rentalId: string; version: number; updatedAt: Date },
  ChangeRentalPeriodError
>;

@CommandHandler(ChangeRentalPeriodCommand)
export class ChangeRentalPeriodHandler implements ICommandHandler<ChangeRentalPeriodCommand, ChangeRentalPeriodResult> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly billing: TenantBillingPreferences,
    private readonly branches: BranchFacts,
    private readonly pricing: PricingCalculation,
    private readonly allocation: RentalAssetAllocationService,
    private readonly splitCalculator: RentalOwnerSplitCalculator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: ChangeRentalPeriodCommand): Promise<ChangeRentalPeriodResult> {
    const { tenantId, tenantUserId, rentalId, expectedVersion, start, end } = command.props;
    const context = { useCase: 'ChangeRentalPeriod', tenantId, tenantUserId, rentalId };
    const initial = await this.rentalRepository.findById(tenantId, rentalId);
    if (!initial)
      return err(this.error('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`, context));
    if (initial.version !== expectedVersion) return err(this.versionConflict(rentalId, context));
    if (initial.status !== RentalStatus.Confirmed)
      return err(this.map(new RentalCannotBeEditedFromStatusError(rentalId, initial.status), context));

    const samePeriod =
      start.getTime() === initial.period.start.getTime() && end.getTime() === initial.period.end.getTime();
    if (samePeriod) {
      return this.unitOfWork.runInTransaction(async ({ tx }) => {
        const current = await this.rentalRepository.findById(tenantId, rentalId, tx);
        if (!current)
          return err(this.error('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`, context));
        if (current.version !== expectedVersion) return err(this.versionConflict(rentalId, context));
        if (current.status !== RentalStatus.Confirmed)
          return err(this.map(new RentalCannotBeEditedFromStatusError(rentalId, current.status), context));
        if (start.getTime() !== current.period.start.getTime() || end.getTime() !== current.period.end.getTime())
          return err(this.versionConflict(rentalId, context));
        return ok({ rentalId, version: current.version, updatedAt: current.updatedAt! });
      });
    }

    const preparationTime = new Date();
    if (preparationTime >= initial.period.end) return err(this.map(new RentalPeriodHasEndedError(rentalId), context));
    if (preparationTime >= initial.period.start && start.getTime() !== initial.period.start.getTime())
      return err(
        this.map(new RentalInvalidFieldError('start', 'must equal the existing start after rental start'), context),
      );
    if (preparationTime < initial.period.start && start <= preparationTime)
      return err(this.map(new RentalPeriodCannotStartInPastError(), context));

    let newPeriod: RentalPeriod;
    try {
      newPeriod = new RentalPeriod(start, end);
    } catch (error) {
      return err(
        this.error(
          'rental_commitment.invalid_rental_period',
          'The requested rental period is invalid.',
          context,
          error,
        ),
      );
    }
    if (preparationTime >= initial.period.start && end <= preparationTime)
      return err(
        this.error('rental_commitment.invalid_rental_period', 'The new end must be after the operation time.', context),
      );

    const preparedPrice = await this.preparePrice(initial, newPeriod, context);
    if (preparedPrice.isErr()) return err(preparedPrice.error);

    try {
      return await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        const current = await this.rentalRepository.findById(tenantId, rentalId, tx);
        if (!current)
          return err(this.error('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`, context));
        if (current.version !== expectedVersion) return err(this.versionConflict(rentalId, context));
        if (current.status !== RentalStatus.Confirmed)
          return err(this.map(new RentalCannotBeEditedFromStatusError(rentalId, current.status), context));
        if (!current.period.equals(initial.period)) return err(this.versionConflict(rentalId, context));

        const operationTime = new Date();
        if (operationTime >= current.period.end) return err(this.map(new RentalPeriodHasEndedError(rentalId), context));

        const started = operationTime >= current.period.start;
        if (started && start.getTime() !== current.period.start.getTime())
          return err(
            this.map(new RentalInvalidFieldError('start', 'must equal the existing start after rental start'), context),
          );
        if (!started && start <= operationTime) return err(this.map(new RentalPeriodCannotStartInPastError(), context));
        if (started && end <= operationTime)
          return err(
            this.error(
              'rental_commitment.invalid_rental_period',
              'The new end must be after the operation time.',
              context,
            ),
          );

        const extending = end > current.period.end;
        if (!started || extending) {
          const available = await this.allocation.areExactAssetsAvailable({
            tenantId,
            assetIds: current.currentAssignedAssets.map((assignment) => assignment.assetId),
            periodStart: started ? current.period.end : start,
            periodEnd: end,
            excludingRentalId: rentalId,
            tx,
          });
          if (!available) return err(this.map(new InsufficientAssetAvailabilityError('', '', 1, 0), context));
        }

        const accessorySelections = await tx.v2RentalAccessorySelection.findMany({
          where: { tenantId, rentalOrderId: rentalId },
          select: { assignments: { select: { assetId: true } } },
        });
        const accessoryAssetIds = accessorySelections.flatMap((selection) =>
          selection.assignments.map((assignment) => assignment.assetId as AssetId),
        );

        const changed = current.changeConfirmedPeriod({
          newPeriod: { start, end },
          confirmedPriceSnapshot: preparedPrice.value,
          operationTime,
        });
        if (changed.isErr()) return err(this.map(changed.error, context));

        const snapshot = getConfirmedPriceSnapshotForOwnerSplits(current.confirmedPriceSnapshot);
        const ownerSplits = this.splitCalculator.calculate({
          tenantId,
          rentalId,
          currency: snapshot.currency,
          selections: current.currentSelections.map(({ id }) => ({ id })),
          demandLines: current.currentDemandLines.map((line) => ({
            id: line.id,
            sourceSelectionId: line.rentalSelectionId,
          })),
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
          expectedVersion,
          ownerSplits,
          accessoryAssetIds,
          tx,
        });
        if (!saved) return err(this.versionConflict(rentalId, context));
        integrationEvents.collect(toRentalIntegrationEvents(current.pullDomainEvents()));
        return ok({ rentalId, version: saved.version, updatedAt: saved.updatedAt });
      });
    } catch (error) {
      if (error instanceof PostgresExclusionViolationError)
        return err(
          this.error(
            'rental_commitment.insufficient_asset_availability',
            'An assigned asset is unavailable.',
            context,
            error,
          ),
        );
      throw error;
    }
  }

  private async preparePrice(
    rental: Rental,
    period: RentalPeriod,
    context: Record<string, unknown>,
  ): Promise<Result<JsonValue, ChangeRentalPeriodError>> {
    const [billing, branch] = await Promise.all([
      this.billing.getTenantBillingPreferences({ tenantId: rental.tenantId }),
      this.branches.getBranchFacts({ tenantId: rental.tenantId, branchId: rental.branchId }),
    ]);
    if (billing.isErr() || branch.isErr())
      return err(
        this.error('rental_commitment.invalid_pricing_input', 'Rental pricing facts are unavailable.', context),
      );
    const previous = rental.confirmedPriceSnapshot!.snapshot;
    const previousLine = new Map(previous.final.lines.map((line) => [line.rentalSelectionId, line]));
    const calculated = await this.pricing.calculateProposedPrice({
      tenantId: rental.tenantId,
      customerId: rental.rentalCustomerId!,
      rentalPeriod: { start: period.start, end: period.end },
      calculationFacts: {
        effectiveTimezone: branch.value.effectiveTimezone,
        dailyBillingPolicy: billing.value.dailyBillingPolicy,
        weekendCountsAsOne: billing.value.weekendCountsAsOne,
      },
      insuranceSelected: rental.insuranceSelected ?? false,
      lines: rental.currentSelections.map((selection) => ({
        lineReference: selection.id,
        rentalOfferId: selection.rentalOfferId,
        rentableItemId: selection.rentableItemId,
        categoryId: previousLine.get(selection.id)?.categoryId,
        quantity: selection.quantity,
      })),
    });
    if (calculated.isErr()) return err(this.map(calculated.error, context));
    return ok(
      adaptPricingCalculationToSnapshot({
        result: calculated.value,
        context: 'CONFIRMED',
        lineDisplayNames: Object.fromEntries(
          rental.currentSelections.map((selection) => [selection.id, selection.rentableItemNameSnapshot]),
        ),
      }),
    );
  }

  private error(
    code: ChangeRentalPeriodError['code'],
    message: string,
    context: Record<string, unknown>,
    cause?: unknown,
  ) {
    return changeRentalPeriodError(code, message, cause, context);
  }
  private versionConflict(rentalId: string, context: Record<string, unknown>) {
    return this.error(
      'rental_commitment.rental_version_conflict',
      `Rental "${rentalId}" was modified by another request.`,
      context,
    );
  }
  private map(error: unknown, context: Record<string, unknown>): ChangeRentalPeriodError {
    if (error instanceof RentalCannotBeEditedFromStatusError)
      return this.error('rental_commitment.rental_cannot_be_edited_from_status', error.message, context, error);
    if (error instanceof RentalPeriodHasEndedError)
      return this.error('rental_commitment.rental_period_ended', error.message, context, error);
    if (error instanceof RentalPeriodCannotStartInPastError)
      return this.error('rental_commitment.invalid_rental_period', error.message, context, error);
    if (error instanceof InsufficientAssetAvailabilityError)
      return this.error('rental_commitment.insufficient_asset_availability', error.message, context, error);
    if (
      error instanceof PricingCalculationError ||
      (error instanceof Error && 'code' in error && error.code === 'INVALID_PRICING_INPUT')
    )
      return this.error('rental_commitment.invalid_pricing_input', error.message, context, error);
    if (error instanceof RentalInvalidFieldError) {
      const code =
        error.field === 'start' || error.field === 'end' || error.field === 'period'
          ? 'rental_commitment.invalid_rental_period'
          : 'rental_commitment.invalid_rental_field';
      return this.error(code, error.message, context, error);
    }
    throw error;
  }
}
