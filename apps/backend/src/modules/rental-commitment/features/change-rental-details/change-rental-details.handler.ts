import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';
import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import {
  PricingTargetTotalAdjustment,
  PricingTargetTotalAdjustmentError,
  PricingTargetTotalAdjustmentResult,
} from 'src/modules/pricing/public-api/pricing-target-total-adjustment.public-api';
import {
  PricingCalculation,
  PricingCalculationError,
} from 'src/modules/pricing/public-api/pricing-calculation.public-api';
import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import {
  RentalCannotBeEditedFromStatusError,
  RentalInvalidFieldError,
  RentalPeriodHasEndedError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalStatus } from '../../domain/rental-status';
import { Rental } from '../../domain/rental.aggregate';
import {
  AcceptedRentalPricingBreakdown,
  AcceptedRentalPricingV3Snapshot,
  toAcceptedRentalPricingV3Snapshot,
} from '../../domain/value-objects/accepted-pricing-snapshot.type';
import { ConfirmedPriceSnapshot } from '../../domain/value-objects/confirmed-price-snapshot.value-object';
import { JsonValue } from '../../domain/value-objects/json-snapshot.value-object';
import { getConfirmedPriceSnapshotForOwnerSplits } from '../../owner-split/confirmed-price-snapshot-for-owner-splits';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalOwnerSplitDraft } from '../../owner-split/owner-split-calculator.types';
import { RentalRepository } from '../../persistence/rental.repository';
import { ChangeRentalDetailsCommand, ChangeRentalDetailsPatch } from './change-rental-details.command';
import { ChangeRentalDetailsError, changeRentalDetailsError } from './change-rental-details.errors';

export type ChangeRentalDetailsResult = Result<
  { rentalId: string; version: number; updatedAt: Date },
  ChangeRentalDetailsError
>;

@CommandHandler(ChangeRentalDetailsCommand)
export class ChangeRentalDetailsHandler implements ICommandHandler<
  ChangeRentalDetailsCommand,
  ChangeRentalDetailsResult
> {
  constructor(
    private readonly rentals: RentalRepository,
    private readonly targetTotalAdjustment: PricingTargetTotalAdjustment,
    private readonly pricingCalculation: PricingCalculation,
    private readonly splitCalculator: RentalOwnerSplitCalculator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: ChangeRentalDetailsCommand): Promise<ChangeRentalDetailsResult> {
    const { tenantId, tenantUserId, rentalId, expectedVersion, patch } = command.props;
    const context = { useCase: 'ChangeRentalDetails', tenantId, tenantUserId, rentalId };
    const initial = await this.rentals.findById(tenantId, rentalId);
    if (!initial)
      return err(this.error('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`, context));
    if (initial.version !== expectedVersion) return err(this.versionConflict(rentalId, context));
    if (initial.status !== RentalStatus.Confirmed)
      return err(this.map(new RentalCannotBeEditedFromStatusError(rentalId, initial.status), context));

    const result = await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
      const current = await this.rentals.findById(tenantId, rentalId, tx);
      if (!current)
        return err(this.error('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`, context));
      if (current.version !== expectedVersion) return err(this.versionConflict(rentalId, context));
      if (current.status !== RentalStatus.Confirmed)
        return err(this.map(new RentalCannotBeEditedFromStatusError(rentalId, current.status), context));

      const change = detectChange(current, patch);
      if (!change.changed) {
        return ok({ rentalId, version: current.version, updatedAt: current.updatedAt! });
      }
      const operationTime = new Date();
      if (operationTime >= current.period.end) return err(this.map(new RentalPeriodHasEndedError(rentalId), context));

      let transformedPrice: JsonValue | undefined;
      if (change.pricingChanged || change.insuranceChanged) {
        let snapshot = toAcceptedRentalPricingV3Snapshot(current.confirmedPriceSnapshot!.snapshot);
        if (change.pricingChanged) {
          const manualPricingAdjustment = patch.manualPricingAdjustment;
          if (manualPricingAdjustment === undefined) {
            throw new Error('Manual pricing adjustment change was detected without an adjustment value.');
          }
          const transformed = this.transformManualPricingAdjustment({
            snapshot,
            adjustment: manualPricingAdjustment,
            tenantUserId,
            operationTime,
            context,
          });
          if (transformed.isErr()) return err(transformed.error);
          snapshot = transformed.value;
        }
        if (change.insuranceChanged) {
          const composed = await this.transformInsuranceComposition({
            tenantId,
            snapshot,
            insuranceSelected: change.details.insuranceSelected ?? false,
            context,
          });
          if (composed.isErr()) return err(composed.error);
          snapshot = composed.value;
        }
        const validatedSnapshot = ConfirmedPriceSnapshot.create(snapshot);
        if (validatedSnapshot.isErr()) return err(this.map(validatedSnapshot.error, context));
        transformedPrice = validatedSnapshot.value.toJSON();
      }

      const changed = current.changeConfirmedDetails({
        ...change.details,
        confirmedPriceSnapshot: transformedPrice,
        operationTime,
      });
      if (changed.isErr()) return err(this.map(changed.error, context));

      let ownerSplits: RentalOwnerSplitDraft[] | undefined;
      if (change.pricingChanged) ownerSplits = this.calculateOwnerSplits(current);

      const saved = await this.rentals.save(current, {
        persistence: 'DETAILS',
        expectedVersion,
        ownerSplits,
        tx,
      });
      if (!saved) return err(this.versionConflict(rentalId, context));
      integrationEvents.collect(toRentalIntegrationEvents(current.pullDomainEvents()));
      return ok({ rentalId, version: expectedVersion + 1, updatedAt: saved.updatedAt });
    });

    if (result.isErr() || result.value.version === expectedVersion) return result;
    const persisted = await this.rentals.findById(tenantId, rentalId);
    if (persisted?.version !== result.value.version) return result;
    return ok({ rentalId, version: persisted.version, updatedAt: persisted.updatedAt! });
  }

  private transformManualPricingAdjustment(input: {
    snapshot: AcceptedRentalPricingV3Snapshot;
    adjustment: NonNullable<ChangeRentalDetailsPatch['manualPricingAdjustment']> | null;
    tenantUserId: string;
    operationTime: Date;
    context: Record<string, unknown>;
  }): Result<AcceptedRentalPricingV3Snapshot, ChangeRentalDetailsError> {
    const snapshotEnvelope = { ...input.snapshot };
    delete snapshotEnvelope.manualPricingAdjustment;
    const final = copyAcceptedPricingBreakdown(input.snapshot.calculated);

    if (input.adjustment === null) {
      return ok(withUpdatedEquipmentTotal({ ...snapshotEnvelope, final }));
    }

    const allocation = this.targetTotalAdjustment.allocate({
      currency: input.snapshot.calculated.currency,
      targetTotal: input.adjustment.targetTotal,
      lines: input.snapshot.calculated.lines.map((line) => ({
        lineReference: line.rentalSelectionId,
        currentTotal: line.total,
      })),
    });
    if (allocation.isErr()) return err(this.map(allocation.error, input.context));

    const reason = normalizeReason(input.adjustment.reason);
    const setAtIso = input.operationTime.toISOString();
    const allocationsByLineReference = new Map(allocation.value.lines.map((line) => [line.lineReference, line]));

    final.total = allocation.value.targetTotal;
    final.lines = final.lines.map((line) => {
      const lineAllocation = allocationsByLineReference.get(line.rentalSelectionId);
      if (!lineAllocation) {
        throw new Error(`Missing target-total allocation for rental selection "${line.rentalSelectionId}".`);
      }
      return {
        ...line,
        total: lineAllocation.finalTotal,
        manualPricingAdjustment: {
          mode: 'TARGET_TOTAL_ALLOCATION',
          direction: lineAllocation.direction,
          amount: lineAllocation.adjustmentAmount,
          setByTenantUserId: input.tenantUserId,
          setAtIso,
          ...(reason ? { reason } : {}),
        },
      };
    });

    return ok(
      withUpdatedEquipmentTotal({
        ...snapshotEnvelope,
        final,
        manualPricingAdjustment: this.toManualPricingAdjustmentMetadata({
          allocation: allocation.value,
          tenantUserId: input.tenantUserId,
          setAtIso,
          reason,
        }),
      }),
    );
  }

  private async transformInsuranceComposition(input: {
    tenantId: string;
    snapshot: AcceptedRentalPricingV3Snapshot;
    insuranceSelected: boolean;
    context: Record<string, unknown>;
  }): Promise<Result<AcceptedRentalPricingV3Snapshot, ChangeRentalDetailsError>> {
    const composition = await this.pricingCalculation.calculateInsuranceForEquipmentPrice({
      tenantId: input.tenantId,
      insuranceSelected: input.insuranceSelected,
      equipmentSubtotalBeforeDiscounts: input.snapshot.calculated.subtotal,
      equipmentTotal: input.snapshot.final.total,
    });
    if (composition.isErr()) return err(this.map(composition.error, input.context));

    return ok({
      ...input.snapshot,
      ...composition.value,
    });
  }

  private toManualPricingAdjustmentMetadata(input: {
    allocation: PricingTargetTotalAdjustmentResult;
    tenantUserId: string;
    setAtIso: string;
    reason?: string;
  }): NonNullable<AcceptedRentalPricingV3Snapshot['manualPricingAdjustment']> {
    return {
      mode: 'TARGET_TOTAL',
      targetTotal: input.allocation.targetTotal,
      previousTotal: input.allocation.currentTotal,
      direction: input.allocation.direction,
      adjustmentTotal: input.allocation.adjustmentTotal,
      setByTenantUserId: input.tenantUserId,
      setAtIso: input.setAtIso,
      ...(input.reason ? { reason: input.reason } : {}),
    };
  }

  private calculateOwnerSplits(rental: Rental): RentalOwnerSplitDraft[] {
    const snapshot = getConfirmedPriceSnapshotForOwnerSplits(rental.confirmedPriceSnapshot);
    return this.splitCalculator.calculate({
      tenantId: rental.tenantId,
      rentalId: rental.id,
      currency: snapshot.currency,
      selections: rental.currentSelections.map(({ id }) => ({ id })),
      demandLines: rental.currentDemandLines.map((line) => ({
        id: line.id,
        sourceSelectionId: line.rentalSelectionId,
      })),
      fulfilledAssets: rental.currentAssignedAssets.map((assignment) => ({
        id: assignment.id,
        rentalDemandLineId: assignment.rentalDemandLineId,
        assetId: assignment.assetId,
        ownershipSnapshot: assignment.ownershipSnapshot.toJSON(),
      })),
      priceLines: snapshot.lines.map((line) => ({ rentalSelectionId: line.rentalSelectionId, netAmount: line.total })),
    }).splits;
  }

  private error(
    code: ChangeRentalDetailsError['code'],
    message: string,
    context: Record<string, unknown>,
    cause?: unknown,
  ) {
    return changeRentalDetailsError(code, message, cause, context);
  }

  private versionConflict(rentalId: string, context: Record<string, unknown>) {
    return this.error(
      'rental_commitment.rental_version_conflict',
      `Rental "${rentalId}" was modified by another request.`,
      context,
    );
  }

  private map(error: unknown, context: Record<string, unknown>): ChangeRentalDetailsError {
    if (error instanceof RentalCannotBeEditedFromStatusError)
      return this.error('rental_commitment.rental_cannot_be_edited_from_status', error.message, context, error);
    if (error instanceof RentalPeriodHasEndedError)
      return this.error('rental_commitment.rental_period_ended', error.message, context, error);
    if (error instanceof RentalInvalidFieldError)
      return this.error('rental_commitment.invalid_rental_field', error.message, context, error);
    if (
      error instanceof PricingTargetTotalAdjustmentError ||
      error instanceof PricingCalculationError ||
      (error instanceof Error && 'code' in error && error.code === 'INVALID_PRICING_INPUT')
    )
      return this.error('rental_commitment.invalid_pricing_input', error.message, context, error);
    throw error;
  }
}

function detectChange(rental: Rental, patch: ChangeRentalDetailsPatch) {
  const details = {
    notes: patch.notes === null ? undefined : (patch.notes ?? rental.notes),
    insuranceSelected: patch.insuranceSelected ?? rental.insuranceSelected,
  };
  const detailsChanged = details.notes !== rental.notes || details.insuranceSelected !== rental.insuranceSelected;
  const hasManualPricingPatch =
    Object.prototype.hasOwnProperty.call(patch, 'manualPricingAdjustment') &&
    patch.manualPricingAdjustment !== undefined;
  const pricingChanged = hasManualPricingPatch && !sameManualAdjustment(rental, patch.manualPricingAdjustment);
  const insuranceChanged = details.insuranceSelected !== rental.insuranceSelected;
  return {
    details,
    pricingChanged,
    insuranceChanged,
    changed: detailsChanged || pricingChanged,
  };
}

function sameManualAdjustment(
  rental: Rental,
  requested: ChangeRentalDetailsPatch['manualPricingAdjustment'] | null,
): boolean {
  const existing = rental.confirmedPriceSnapshot!.snapshot.manualPricingAdjustment;
  if (requested === null || requested === undefined) return existing === undefined;
  if (
    !existing ||
    requested.mode !== existing.mode ||
    normalizeReason(requested.reason) !== normalizeReason(existing.reason)
  )
    return false;
  try {
    return new Decimal(requested.targetTotal).equals(existing.targetTotal);
  } catch {
    return false;
  }
}

function copyAcceptedPricingBreakdown(breakdown: AcceptedRentalPricingBreakdown): AcceptedRentalPricingBreakdown {
  return {
    ...breakdown,
    durationPolicySnapshot: { ...breakdown.durationPolicySnapshot },
    lines: breakdown.lines.map(({ manualPricingAdjustment: _manualAdjustment, ...line }) => ({ ...line })),
    appliedPromotions: breakdown.appliedPromotions.map((promotion) => ({ ...promotion })),
    ...(breakdown.appliedCoupon ? { appliedCoupon: { ...breakdown.appliedCoupon } } : {}),
  };
}

function withUpdatedEquipmentTotal(snapshot: AcceptedRentalPricingV3Snapshot): AcceptedRentalPricingV3Snapshot {
  return {
    ...snapshot,
    totalBeforeInsurance: snapshot.final.total,
    total: new Decimal(snapshot.final.total).plus(snapshot.insurance.amount).toFixed(2),
  };
}

function normalizeReason(reason?: string): string | undefined {
  const normalized = reason?.trim();
  return normalized ? normalized : undefined;
}
