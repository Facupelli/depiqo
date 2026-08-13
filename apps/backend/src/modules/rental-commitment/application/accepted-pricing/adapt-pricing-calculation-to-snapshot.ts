import { PricingCalculationResult } from 'src/modules/pricing/public-api/pricing-calculation.public-api';

import {
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA,
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION,
  AcceptedRentalPricingBreakdownV1,
  AcceptedRentalPricingContext,
  AcceptedRentalPricingSnapshotV1,
} from '../../domain/value-objects/accepted-pricing-snapshot.type';

type RentalManualPricingAdjustment = { targetTotal: string; setByTenantUserId: string; reason?: string };

export function adaptPricingCalculationToSnapshot(input: {
  result: PricingCalculationResult;
  context: AcceptedRentalPricingContext;
  manualPricingAdjustment?: RentalManualPricingAdjustment;
  lineDisplayNames?: Record<string, string>;
}): AcceptedRentalPricingSnapshotV1 {
  return {
    schema: ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA,
    version: ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION,
    calculatedAtIso: input.result.calculatedAt.toISOString(),
    context: input.context,
    calculated: toPersistedBreakdown(input.result.calculated, undefined, undefined, input.lineDisplayNames),
    final: toPersistedBreakdown(
      input.result.final,
      input.manualPricingAdjustment,
      input.result.calculatedAt,
      input.lineDisplayNames,
    ),
    ...(input.result.targetTotalAdjustment && input.manualPricingAdjustment
      ? {
          manualPricingAdjustment: {
            ...input.result.targetTotalAdjustment,
            mode: 'TARGET_TOTAL',
            setByTenantUserId: input.manualPricingAdjustment.setByTenantUserId,
            setAtIso: input.result.calculatedAt.toISOString(),
            ...(input.manualPricingAdjustment.reason ? { reason: input.manualPricingAdjustment.reason } : {}),
          },
        }
      : {}),
  };
}

function toPersistedBreakdown(
  breakdown: PricingCalculationResult['final'],
  adjustment?: RentalManualPricingAdjustment,
  appliedAt?: Date,
  lineDisplayNames?: Record<string, string>,
): AcceptedRentalPricingBreakdownV1 {
  return {
    currency: breakdown.currency,
    subtotal: breakdown.subtotal,
    discountTotal: breakdown.discountTotal,
    total: breakdown.total,
    chargedDays: breakdown.chargedDays,
    durationPolicySnapshot: breakdown.durationPolicy,
    lines: breakdown.lines.map((line) => ({
      rentalSelectionId: line.lineReference,
      rentalOfferId: line.rentalOfferId,
      rentableItemId: line.rentableItemId,
      rentableItemName: lineDisplayNames?.[line.lineReference] ?? line.rentalOfferId,
      ...(line.categoryId ? { categoryId: line.categoryId } : {}),
      quantity: line.quantity,
      chargedUnits: line.chargedUnits,
      billingUnit: line.billingUnit,
      ratePlanId: line.ratePlanId,
      appliedTierId: line.appliedTier.tierId,
      pricePerUnit: line.appliedTier.pricePerUnit,
      subtotal: line.subtotal,
      discountTotal: line.discountTotal,
      total: line.total,
      appliedAdjustments: line.appliedAdjustments,
      ...(line.targetTotalAllocation && adjustment && appliedAt
        ? {
            manualPricingAdjustment: {
              mode: 'TARGET_TOTAL_ALLOCATION' as const,
              direction: line.targetTotalAllocation.direction,
              amount: line.targetTotalAllocation.amount,
              setByTenantUserId: adjustment.setByTenantUserId,
              setAtIso: appliedAt.toISOString(),
              ...(adjustment.reason ? { reason: adjustment.reason } : {}),
            },
          }
        : {}),
    })),
    appliedPromotions: breakdown.appliedPromotions,
    ...(breakdown.appliedCoupon ? { appliedCoupon: breakdown.appliedCoupon } : {}),
  };
}
