import type { GetRentalDetailV2PricingDto } from '@repo/api-contracts';
import type { AcceptedRentalPricingSnapshot } from '../../domain/value-objects/accepted-pricing-snapshot.type';
import type {
  AcceptedRentalPricing,
  AcceptedRentalPricingBillingUnit,
} from '../../public-api/accepted-rental-pricing-facts.public-api';

export function toRentalDetailPricing(snapshot: AcceptedRentalPricingSnapshot): GetRentalDetailV2PricingDto {
  return {
    kind: 'V2',
    ...snapshot.final,
    insurance: snapshot.insurance,
    totalBeforeInsurance: snapshot.totalBeforeInsurance,
    total: snapshot.total,
    lines: snapshot.final.lines.map((line) => ({
      ...line,
      manualPricingAdjustment: line.manualPricingAdjustment ?? null,
    })),
    appliedCoupon: snapshot.final.appliedCoupon ?? null,
    manualPricingAdjustment: snapshot.manualPricingAdjustment ?? null,
  };
}

export function toAcceptedRentalPricingFacts(snapshot: AcceptedRentalPricingSnapshot): AcceptedRentalPricing {
  return {
    total: { amount: snapshot.total, currency: snapshot.final.currency },
    chargedUnits: snapshot.final.chargedDays,
    billingUnit: resolveBillingUnit(snapshot.final.lines),
  };
}

function resolveBillingUnit(
  lines: Array<{ billingUnit: AcceptedRentalPricingBillingUnit }>,
): AcceptedRentalPricingBillingUnit | undefined {
  const billingUnits = new Set(lines.map((line) => line.billingUnit));
  return billingUnits.size === 1 ? [...billingUnits][0] : undefined;
}
