import { BasePricingInput } from '../base/base-pricing-input.type';
import { BasePricingResult } from '../base/base-pricing-result.type';
import { Money } from '../money/money.value-object';
import { PricingContext, PricingContextLine } from './pricing-context.types';
import { toLocalDate } from '../shared/local-date';

type PricingContextFactoryInput = {
  input: BasePricingInput & {
    customerId?: string;
    calculationDate: Date;
  };
  baseResult: BasePricingResult;
};

export class PricingContextFactory {
  create(input: PricingContextFactoryInput): PricingContext {
    const { input: pricingInput, baseResult } = input;

    const lines = baseResult.lines.map((line): PricingContextLine => {
      const pricePerUnit = Money.of(line.pricePerUnit, baseResult.currency);
      const subtotal = Money.of(line.subtotal, baseResult.currency);
      const discountTotal = Money.zero(baseResult.currency);
      const total = Money.of(line.total, baseResult.currency);

      return {
        rentalSelectionId: line.rentalSelectionId,
        rentalOfferId: line.rentalOfferId,
        rentableItemId: line.rentableItemId,
        rentableItemName: line.rentableItemName,
        categoryId: line.categoryId,
        quantity: line.quantity,
        chargedUnits: line.chargedUnits,
        billingUnit: line.billingUnit,
        ratePlanId: line.ratePlanId,
        appliedTierId: line.appliedTierId,
        pricePerUnit,
        subtotal,
        discountTotal,
        total,
        appliedAdjustments: [],
      };
    });

    return {
      tenantId: pricingInput.tenantId,
      branchId: pricingInput.branchId,
      customerId: pricingInput.customerId,
      currency: baseResult.currency,
      subtotal: Money.of(baseResult.subtotal, baseResult.currency),
      discountTotal: Money.zero(baseResult.currency),
      total: Money.of(baseResult.total, baseResult.currency),
      chargedDays: baseResult.chargedDays,
      calculationDate: pricingInput.calculationDate,
      calculationLocalDate: toLocalDate(pricingInput.calculationDate, pricingInput.pricingConfig.timezone),
      durationPolicySnapshot: baseResult.durationPolicySnapshot,
      lines,
    };
  }
}
