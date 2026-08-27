import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import {
  PricingCalculation,
  PricingCalculationError,
} from 'src/modules/pricing/public-api/pricing-calculation.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantBillingPreferences } from 'src/modules/tenant-management/public-api/tenant-billing-preferences.public-api';

import { adaptPricingCalculationToSnapshot } from '../../application/accepted-pricing/adapt-pricing-calculation-to-snapshot';
import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import {
  RentalCannotBeEditedFromStatusError,
  RentalInvalidFieldError,
  RentalMustContainSelectionError,
  RentalPeriodHasEndedError,
  RentalSelectionNotFoundError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalStatus } from '../../domain/rental-status';
import { getConfirmedPriceSnapshotForOwnerSplits } from '../../owner-split/confirmed-price-snapshot-for-owner-splits';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalRepository } from '../../persistence/rental.repository';
import { RemoveRentalSelectionCommand } from './remove-rental-selection.command';
import { RemoveRentalSelectionError, removeRentalSelectionError } from './remove-rental-selection.errors';

export type RemoveRentalSelectionResult = Result<
  { rentalId: string; version: number; updatedAt: Date },
  RemoveRentalSelectionError
>;

@CommandHandler(RemoveRentalSelectionCommand)
export class RemoveRentalSelectionHandler implements ICommandHandler<
  RemoveRentalSelectionCommand,
  RemoveRentalSelectionResult
> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly billing: TenantBillingPreferences,
    private readonly branches: BranchFacts,
    private readonly pricing: PricingCalculation,
    private readonly splitCalculator: RentalOwnerSplitCalculator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: RemoveRentalSelectionCommand): Promise<RemoveRentalSelectionResult> {
    const { tenantId, tenantUserId, rentalId, selectionId, expectedVersion } = command.props;
    const context = { useCase: 'RemoveRentalSelection', tenantId, tenantUserId, rentalId, selectionId };
    const rental = await this.rentalRepository.findById(tenantId, rentalId);
    if (!rental)
      return err(this.error('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`, context));
    if (rental.status !== RentalStatus.Confirmed) {
      return err(this.map(new RentalCannotBeEditedFromStatusError(rentalId, rental.status), context));
    }
    const target = rental.currentSelections.find((selection) => selection.id === selectionId);
    if (!target) return err(this.map(new RentalSelectionNotFoundError(rentalId, selectionId), context));
    if (rental.currentSelections.length === 1) return err(this.map(new RentalMustContainSelectionError(), context));

    const [billing, branch] = await Promise.all([
      this.billing.getTenantBillingPreferences({ tenantId }),
      this.branches.getBranchFacts({ tenantId, branchId: rental.branchId }),
    ]);
    if (billing.isErr() || branch.isErr()) {
      return err(
        this.error('rental_commitment.invalid_pricing_input', 'Rental pricing facts are unavailable.', context),
      );
    }

    const previous = rental.confirmedPriceSnapshot!.snapshot;
    const previousLine = new Map(previous.final.lines.map((line) => [line.rentalSelectionId, line]));
    const remainingSelections = rental.currentSelections.filter((selection) => selection.id !== selectionId);
    const calculated = await this.pricing.calculateProposedPrice({
      tenantId,
      customerId: rental.rentalCustomerId!,
      rentalPeriod: { start: rental.period.start, end: rental.period.end },
      calculationFacts: {
        effectiveTimezone: branch.value.effectiveTimezone,
        dailyBillingPolicy: billing.value.dailyBillingPolicy,
        weekendCountsAsOne: billing.value.weekendCountsAsOne,
      },
      insuranceSelected: rental.insuranceSelected ?? false,
      lines: remainingSelections.map((selection) => ({
        lineReference: selection.id,
        rentalOfferId: selection.rentalOfferId,
        rentableItemId: selection.rentableItemId,
        rentableItemKind: selection.rentableItemKindSnapshot,
        categoryId: previousLine.get(selection.id)?.categoryId,
        quantity: selection.quantity,
      })),
    });
    if (calculated.isErr()) return err(this.map(calculated.error, context));
    const preparedPrice = adaptPricingCalculationToSnapshot({
      result: calculated.value,
      context: 'CONFIRMED',
      lineDisplayNames: Object.fromEntries(
        remainingSelections.map((selection) => [selection.id, selection.rentableItemNameSnapshot]),
      ),
    });

    return this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
      const current = await this.rentalRepository.findById(tenantId, rentalId, tx);
      if (!current)
        return err(this.error('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`, context));
      if (current.version !== expectedVersion || rental.version !== expectedVersion) {
        return err(
          this.error(
            'rental_commitment.rental_version_conflict',
            `Rental "${rentalId}" was modified by another request.`,
            context,
          ),
        );
      }
      if (current.status !== RentalStatus.Confirmed) {
        return err(this.map(new RentalCannotBeEditedFromStatusError(rentalId, current.status), context));
      }
      const currentTarget = current.currentSelections.find((selection) => selection.id === selectionId);
      if (!currentTarget) return err(this.map(new RentalSelectionNotFoundError(rentalId, selectionId), context));
      if (current.currentSelections.length === 1) return err(this.map(new RentalMustContainSelectionError(), context));

      const operationTime = new Date();
      const effectiveAt = operationTime < current.period.start ? current.period.start : operationTime;
      if (effectiveAt >= current.period.end) return err(this.map(new RentalPeriodHasEndedError(rentalId), context));

      const targetDemandLineIds = current.currentDemandLines
        .filter((line) => line.rentalSelectionId === selectionId)
        .map((line) => line.id);
      const accessoryReference = await tx.v2RentalAccessorySelection.findFirst({
        where: {
          tenantId,
          rentalOrderId: rentalId,
          sourceRentalDemandLineId: { in: targetDemandLineIds },
        },
        select: { id: true },
      });
      if (accessoryReference) {
        return err(
          this.error(
            'rental_commitment.rental_selection_referenced_by_accessory',
            `Rental selection "${selectionId}" is referenced by a current accessory selection.`,
            context,
          ),
        );
      }

      const removed = current.removeConfirmedSelection({
        selectionId,
        confirmedPriceSnapshot: preparedPrice,
        operationTime,
      });
      if (removed.isErr()) return err(this.map(removed.error, context));

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
      const saved = await this.rentalRepository.save(current, { expectedVersion, ownerSplits, tx });
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
  }

  private error(
    code: RemoveRentalSelectionError['code'],
    message: string,
    context: Record<string, unknown>,
    cause?: unknown,
  ) {
    return removeRentalSelectionError(code, message, cause, context);
  }

  private map(error: unknown, context: Record<string, unknown>): RemoveRentalSelectionError {
    if (error instanceof RentalSelectionNotFoundError)
      return this.error('rental_commitment.rental_selection_not_found', error.message, context, error);
    if (error instanceof RentalCannotBeEditedFromStatusError)
      return this.error('rental_commitment.rental_cannot_be_edited_from_status', error.message, context, error);
    if (error instanceof RentalMustContainSelectionError)
      return this.error('rental_commitment.rental_requires_selection', error.message, context, error);
    if (error instanceof RentalPeriodHasEndedError)
      return this.error('rental_commitment.rental_period_ended', error.message, context, error);
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
