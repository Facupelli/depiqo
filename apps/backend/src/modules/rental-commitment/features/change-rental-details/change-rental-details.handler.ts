import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import Decimal from 'decimal.js';
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
  RentalPeriodHasEndedError,
  UnsupportedBranchFulfillmentMethodError,
} from '../../domain/errors/rental-commitment.errors';
import { FulfillmentMethod, RentalStatus } from '../../domain/rental-status';
import { Rental, RentalDeliveryDetails } from '../../domain/rental.aggregate';
import { AcceptedRentalPricingSnapshotV1 } from '../../domain/value-objects/accepted-pricing-snapshot.type';
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
    private readonly billing: TenantBillingPreferences,
    private readonly branches: BranchFacts,
    private readonly pricing: PricingCalculation,
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

    const initialChange = detectChange(initial, patch);
    let preparedPrice: JsonValue | undefined;
    if (initialChange.pricingChanged) {
      const prepared = await this.preparePrice(initial, patch.manualPricingAdjustment!, tenantUserId, context);
      if (prepared.isErr()) return err(prepared.error);
      preparedPrice = prepared.value;
    }

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
      if (change.pricingChanged !== initialChange.pricingChanged || (change.pricingChanged && !preparedPrice)) {
        return err(this.versionConflict(rentalId, context));
      }

      const operationTime = new Date();
      if (operationTime >= current.period.end) return err(this.map(new RentalPeriodHasEndedError(rentalId), context));
      if (change.fulfillmentOrDeliveryChanged && operationTime >= current.period.start) {
        return err(
          this.map(
            new RentalInvalidFieldError(
              'fulfillmentMethod',
              'fulfillment method and delivery details cannot change after the rental starts',
            ),
            context,
          ),
        );
      }
      if (
        (change.details.fulfillmentMethod === FulfillmentMethod.Pickup && change.details.deliveryDetails) ||
        (change.details.fulfillmentMethod === FulfillmentMethod.Delivery && !change.details.deliveryDetails)
      ) {
        return err(
          this.map(
            new RentalInvalidFieldError(
              'deliveryDetails',
              change.details.fulfillmentMethod === FulfillmentMethod.Delivery
                ? 'must be present for delivery fulfillment'
                : 'must be absent for pickup fulfillment',
            ),
            context,
          ),
        );
      }

      if (change.fulfillmentOrDeliveryChanged) {
        const branch = await this.branches.getBranchFacts({ tenantId, branchId: current.branchId });
        if (branch.isErr())
          return err(
            this.error(
              'rental_commitment.invalid_rental_field',
              'Branch fulfillment facts are unavailable.',
              context,
              branch.error,
            ),
          );
        if (change.details.fulfillmentMethod === FulfillmentMethod.Delivery && !branch.value.supportsDelivery) {
          return err(
            this.map(
              new UnsupportedBranchFulfillmentMethodError(current.branchId, change.details.fulfillmentMethod),
              context,
            ),
          );
        }
      }

      const changed = current.changeConfirmedDetails({
        ...change.details,
        confirmedPriceSnapshot: change.pricingChanged ? preparedPrice : undefined,
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

  private async preparePrice(
    rental: Rental,
    adjustment: NonNullable<ChangeRentalDetailsPatch['manualPricingAdjustment']> | null,
    tenantUserId: string,
    context: Record<string, unknown>,
  ): Promise<Result<JsonValue, ChangeRentalDetailsError>> {
    const [billing, branch] = await Promise.all([
      this.billing.getTenantBillingPreferences({ tenantId: rental.tenantId }),
      this.branches.getBranchFacts({ tenantId: rental.tenantId, branchId: rental.branchId }),
    ]);
    if (billing.isErr() || branch.isErr())
      return err(
        this.error('rental_commitment.invalid_pricing_input', 'Rental pricing facts are unavailable.', context),
      );

    const previous = rental.confirmedPriceSnapshot!.toJSON() as AcceptedRentalPricingSnapshotV1;
    const previousLine = new Map(previous.final.lines.map((line) => [line.rentalSelectionId, line]));
    const calculated = await this.pricing.calculateProposedPrice({
      tenantId: rental.tenantId,
      customerId: rental.rentalCustomerId!,
      rentalPeriod: { start: rental.period.start, end: rental.period.end },
      calculationFacts: {
        effectiveTimezone: branch.value.effectiveTimezone,
        dailyBillingPolicy: billing.value.dailyBillingPolicy,
        weekendCountsAsOne: billing.value.weekendCountsAsOne,
      },
      lines: rental.currentSelections.map((selection) => ({
        lineReference: selection.id,
        rentalOfferId: selection.rentalOfferId,
        rentableItemId: selection.rentableItemId,
        categoryId: previousLine.get(selection.id)?.categoryId,
        quantity: selection.quantity,
      })),
      targetTotalAdjustment: adjustment ? { targetTotal: adjustment.targetTotal } : undefined,
    });
    if (calculated.isErr()) return err(this.map(calculated.error, context));

    return ok(
      adaptPricingCalculationToSnapshot({
        result: calculated.value,
        context: 'CONFIRMED',
        lineDisplayNames: Object.fromEntries(
          rental.currentSelections.map((selection) => [selection.id, selection.rentableItemNameSnapshot]),
        ),
        manualPricingAdjustment: adjustment ? { ...adjustment, setByTenantUserId: tenantUserId } : undefined,
      }),
    );
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
    if (error instanceof UnsupportedBranchFulfillmentMethodError)
      return this.error('rental_commitment.unsupported_branch_fulfillment_method', error.message, context, error);
    if (error instanceof RentalInvalidFieldError)
      return this.error('rental_commitment.invalid_rental_field', error.message, context, error);
    if (
      error instanceof PricingCalculationError ||
      (error instanceof Error && 'code' in error && error.code === 'INVALID_PRICING_INPUT')
    )
      return this.error('rental_commitment.invalid_pricing_input', error.message, context, error);
    throw error;
  }
}

function detectChange(rental: Rental, patch: ChangeRentalDetailsPatch) {
  const details = {
    fulfillmentMethod: patch.fulfillmentMethod ?? rental.fulfillmentMethod!,
    deliveryDetails: patch.deliveryDetails === null ? undefined : (patch.deliveryDetails ?? rental.deliveryDetails),
    notes: patch.notes === null ? undefined : (patch.notes ?? rental.notes),
    insuranceSelected: patch.insuranceSelected ?? rental.insuranceSelected,
  };
  const fulfillmentOrDeliveryChanged =
    details.fulfillmentMethod !== rental.fulfillmentMethod ||
    !sameDeliveryDetails(details.deliveryDetails, rental.deliveryDetails);
  const detailsChanged =
    fulfillmentOrDeliveryChanged ||
    details.notes !== rental.notes ||
    details.insuranceSelected !== rental.insuranceSelected;
  const pricingChanged =
    Object.prototype.hasOwnProperty.call(patch, 'manualPricingAdjustment') &&
    !sameManualAdjustment(rental, patch.manualPricingAdjustment ?? null);
  return { details, fulfillmentOrDeliveryChanged, pricingChanged, changed: detailsChanged || pricingChanged };
}

function sameManualAdjustment(
  rental: Rental,
  requested: ChangeRentalDetailsPatch['manualPricingAdjustment'] | null,
): boolean {
  const existing = (rental.confirmedPriceSnapshot!.toJSON() as AcceptedRentalPricingSnapshotV1).manualPricingAdjustment;
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

function normalizeReason(reason?: string): string | undefined {
  const normalized = reason?.trim();
  return normalized ? normalized : undefined;
}

function sameDeliveryDetails(left?: RentalDeliveryDetails, right?: RentalDeliveryDetails): boolean {
  return (
    left?.addressLine1 === right?.addressLine1 &&
    left?.addressLine2 === right?.addressLine2 &&
    left?.city === right?.city &&
    left?.state === right?.state &&
    left?.postalCode === right?.postalCode &&
    left?.country === right?.country &&
    left?.contactName === right?.contactName &&
    left?.contactPhone === right?.contactPhone &&
    left?.notes === right?.notes
  );
}
