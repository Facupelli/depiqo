import { BaseRentalLineCalculator } from './base-rental-line-calculator';
import { BasePricingResult } from './base-pricing-result.type';
import { BasePricingInput } from './base-pricing-input.type';
import { InvalidPricingInputError, MixedCurrencyError } from '../errors/pricing.errors';
import { Money } from '../money/money.value-object';
import { RentalDurationCalculator } from './rental-duration-calculator';

export class BaseRentalPricingService {
  constructor(
    private readonly lineCalculator = new BaseRentalLineCalculator(),
    private readonly durationCalculator = new RentalDurationCalculator(),
  ) {}

  calculate(input: BasePricingInput): BasePricingResult {
    this.validateInput(input);

    const currency = this.resolveSingleCurrency(input);

    const lines = input.selections.map((selection) =>
      this.lineCalculator.calculateLine({
        rentalPeriod: input.rentalPeriod,
        pricingConfig: input.pricingConfig,
        selection,
      }),
    );

    const subtotal = lines.reduce((total, line) => total.add(Money.of(line.subtotal, currency)), Money.zero(currency));

    const subtotalSnapshot = subtotal.toSnapshotString();
    const zeroDiscount = Money.zero(currency).toSnapshotString();
    const chargedDays = this.durationCalculator.calculateChargedDays({
      start: input.rentalPeriod.start,
      end: input.rentalPeriod.end,
      dailyBillingPolicy: input.pricingConfig.dailyBillingPolicy,
      minimumChargedDays: input.pricingConfig.minimumChargedDays,
      halfDayThresholdMinutes: input.pricingConfig.halfDayThresholdMinutes,
    });

    return {
      currency,
      subtotal: subtotalSnapshot,
      discountTotal: zeroDiscount,
      total: subtotalSnapshot,
      chargedDays,
      lines,
      durationPolicySnapshot: {
        timezone: input.pricingConfig.timezone,
        dailyBillingPolicy: input.pricingConfig.dailyBillingPolicy,
        minimumChargedDays: input.pricingConfig.minimumChargedDays,
        halfDayThresholdMinutes: input.pricingConfig.halfDayThresholdMinutes,
      },
    };
  }

  private validateInput(input: BasePricingInput): void {
    if (!input.tenantId.trim()) {
      throw new InvalidPricingInputError('Tenant id is required.');
    }

    if (!input.branchId.trim()) {
      throw new InvalidPricingInputError('Branch id is required.');
    }

    if (!this.isValidDate(input.rentalPeriod.start)) {
      throw new InvalidPricingInputError('Rental period start must be a valid Date.');
    }

    if (!this.isValidDate(input.rentalPeriod.end)) {
      throw new InvalidPricingInputError('Rental period end must be a valid Date.');
    }

    if (input.rentalPeriod.end <= input.rentalPeriod.start) {
      throw new InvalidPricingInputError('Rental period end must be after rental period start.');
    }

    if (!input.pricingConfig.timezone.trim()) {
      throw new InvalidPricingInputError('Pricing timezone is required.');
    }

    if (!Number.isInteger(input.pricingConfig.minimumChargedDays)) {
      throw new InvalidPricingInputError('Minimum charged days must be an integer.');
    }

    if (input.pricingConfig.minimumChargedDays < 1) {
      throw new InvalidPricingInputError('Minimum charged days must be at least 1.');
    }

    if (
      input.pricingConfig.dailyBillingPolicy === 'BILL_OVER_HALF_DAY' &&
      !this.isValidHalfDayThreshold(input.pricingConfig.halfDayThresholdMinutes)
    ) {
      throw new InvalidPricingInputError(
        'Half-day threshold minutes must be provided and greater than zero for BILL_OVER_HALF_DAY policy.',
      );
    }

    if (input.selections.length === 0) {
      throw new InvalidPricingInputError('At least one rental offer selection is required.');
    }

    for (const selection of input.selections) {
      this.validateSelection(selection);
    }
  }

  private validateSelection(selection: BasePricingInput['selections'][number]): void {
    if (!selection.rentalOfferId.trim()) {
      throw new InvalidPricingInputError('Rental offer id is required.');
    }

    if (!selection.rentableItemId.trim()) {
      throw new InvalidPricingInputError('Rentable item id is required.');
    }

    if (!selection.rentableItemName.trim()) {
      throw new InvalidPricingInputError('Rentable item name is required.');
    }

    if (!Number.isInteger(selection.quantity) || selection.quantity < 1) {
      throw new InvalidPricingInputError(
        `Selection quantity must be a positive integer for rental offer "${selection.rentalOfferId}".`,
      );
    }

    if (!selection.ratePlan.id.trim()) {
      throw new InvalidPricingInputError(`Rate plan id is required for rental offer "${selection.rentalOfferId}".`);
    }

    if (!selection.ratePlan.currency.trim()) {
      throw new InvalidPricingInputError(`Rate plan currency is required for rate plan "${selection.ratePlan.id}".`);
    }

    if (selection.ratePlan.tiers.length === 0) {
      throw new InvalidPricingInputError(`Rate plan "${selection.ratePlan.id}" must have at least one tier.`);
    }

    for (const tier of selection.ratePlan.tiers) {
      if (!tier.id.trim()) {
        throw new InvalidPricingInputError(`Rate plan tier id is required for rate plan "${selection.ratePlan.id}".`);
      }

      if (!Number.isInteger(tier.fromUnit) || tier.fromUnit < 1) {
        throw new InvalidPricingInputError(
          `Rate plan tier "${tier.id}" must have a fromUnit greater than or equal to 1.`,
        );
      }

      if (tier.toUnit !== null && (!Number.isInteger(tier.toUnit) || tier.toUnit < tier.fromUnit)) {
        throw new InvalidPricingInputError(
          `Rate plan tier "${tier.id}" must have a valid toUnit greater than or equal to fromUnit.`,
        );
      }

      if (!tier.pricePerUnit.trim()) {
        throw new InvalidPricingInputError(`Rate plan tier "${tier.id}" must have a price per unit.`);
      }
    }
  }

  private resolveSingleCurrency(input: BasePricingInput): string {
    const currencies = [
      ...new Set(input.selections.map((selection) => selection.ratePlan.currency.trim().toUpperCase())),
    ];

    if (currencies.length > 1) {
      throw new MixedCurrencyError({ currencies });
    }

    return currencies[0];
  }

  private isValidDate(value: Date): boolean {
    return value instanceof Date && !Number.isNaN(value.getTime());
  }

  private isValidHalfDayThreshold(value: number | undefined): value is number {
    if (value === undefined) {
      return false;
    }
    return Number.isInteger(value) && value > 0;
  }
}
