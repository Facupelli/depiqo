import { BasePricingInput } from './base-pricing-input.type';
import { BasePricingResultLine } from './base-pricing-result.type';
import { Money } from '../money/money.value-object';
import { RentalDurationCalculator } from './rental-duration-calculator';
import { RatePlanTierSelector } from './rate-plan-tier-selector';

type BaseRentalLineCalculatorInput = {
  rentalPeriod: BasePricingInput['rentalPeriod'];
  pricingConfig: BasePricingInput['pricingConfig'];
  selection: BasePricingInput['selections'][number];
};

export class BaseRentalLineCalculator {
  constructor(
    private readonly durationCalculator = new RentalDurationCalculator(),
    private readonly tierSelector = new RatePlanTierSelector(),
  ) {}

  calculateLine(input: BaseRentalLineCalculatorInput): BasePricingResultLine {
    const { rentalPeriod, pricingConfig, selection } = input;

    const chargedUnits = this.durationCalculator.calculateChargedUnits({
      start: rentalPeriod.start,
      end: rentalPeriod.end,
      billingUnit: selection.ratePlan.billingUnit,
      dailyBillingPolicy: pricingConfig.dailyBillingPolicy,
      weekendCountsAsOne: pricingConfig.weekendCountsAsOne,
      timezone: pricingConfig.timezone,
      minimumChargedDays: pricingConfig.minimumChargedDays,
      quarterDayThresholdMinutes: pricingConfig.quarterDayThresholdMinutes,
      halfDayThresholdMinutes: pricingConfig.halfDayThresholdMinutes,
    });

    const appliedTier = this.tierSelector.selectTier({
      ratePlanId: selection.ratePlan.id,
      chargedUnits,
      tiers: selection.ratePlan.tiers,
    });

    const pricePerUnit = Money.of(appliedTier.pricePerUnit, selection.ratePlan.currency);

    const subtotal = pricePerUnit.multiplyByInteger(chargedUnits).multiplyByInteger(selection.quantity);

    return {
      rentalSelectionId: selection.rentalSelectionId,
      rentalOfferId: selection.rentalOfferId,
      rentableItemId: selection.rentableItemId,
      rentableItemName: selection.rentableItemName,
      categoryId: selection.categoryId,
      quantity: selection.quantity,
      chargedUnits,
      billingUnit: selection.ratePlan.billingUnit,
      ratePlanId: selection.ratePlan.id,
      appliedTierId: appliedTier.id,
      pricePerUnit: pricePerUnit.toSnapshotString(),
      subtotal: subtotal.toSnapshotString(),
      discountTotal: Money.zero(selection.ratePlan.currency).toSnapshotString(),
      total: subtotal.toSnapshotString(),
    };
  }
}
