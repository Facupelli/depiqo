import { PriceSnapshot } from 'src/modules/order/domain/value-objects/price-snapshot.value-object';
import { NewPricingResult } from 'src/modules/pricing/domain/services/new-pricing-calculator.service';

export function toPriceSnapshot(result: NewPricingResult, currency: string): PriceSnapshot {
  const discounts = result.appliedAdjustments.map((adjustment) => ({
    sourceKind: adjustment.sourceKind,
    sourceId: adjustment.sourceId,
    label: adjustment.label,
    type: adjustment.effectType,
    value: adjustment.configuredValue,
    discountAmount: adjustment.discountAmount.toDecimal(),
  }));

  return PriceSnapshot.create({
    currency,
    basePrice: result.basePrice.toDecimal(),
    finalPrice: result.finalPrice.toDecimal(),
    totalUnits: result.totalUnits,
    pricePerBillingUnit: result.pricePerBillingUnit.toDecimal(),
    discounts,
  });
}
