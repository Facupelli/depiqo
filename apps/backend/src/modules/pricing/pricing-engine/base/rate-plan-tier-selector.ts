import {
  AmbiguousRatePlanTierError,
  InvalidPricingInputError,
  MissingRatePlanTierError,
} from '../errors/pricing.errors';
import { BasePricingRatePlanTierInput } from './base-pricing-input.type';

type RatePlanTierSelectorInput = {
  ratePlanId: string;
  chargedUnits: number;
  tiers: BasePricingRatePlanTierInput[];
};

export class RatePlanTierSelector {
  selectTier(input: RatePlanTierSelectorInput): BasePricingRatePlanTierInput {
    this.validateInput(input);

    const matchingTiers = input.tiers.filter((tier) =>
      this.matchesChargedUnits({
        tier,
        chargedUnits: input.chargedUnits,
      }),
    );

    if (matchingTiers.length === 0) {
      throw new MissingRatePlanTierError({
        ratePlanId: input.ratePlanId,
        chargedUnits: input.chargedUnits,
      });
    }

    if (matchingTiers.length > 1) {
      throw new AmbiguousRatePlanTierError({
        ratePlanId: input.ratePlanId,
        chargedUnits: input.chargedUnits,
        matchingTierIds: matchingTiers.map((tier) => tier.id),
      });
    }

    return matchingTiers[0];
  }

  private matchesChargedUnits(input: { tier: BasePricingRatePlanTierInput; chargedUnits: number }): boolean {
    const { tier, chargedUnits } = input;

    return tier.fromUnit <= chargedUnits && (tier.toUnit === null || chargedUnits <= tier.toUnit);
  }

  private validateInput(input: RatePlanTierSelectorInput): void {
    if (!input.ratePlanId.trim()) {
      throw new InvalidPricingInputError('Rate plan id is required to select a tier.');
    }

    if (!Number.isInteger(input.chargedUnits) || input.chargedUnits < 1) {
      throw new InvalidPricingInputError(
        `Charged units must be a positive integer for rate plan "${input.ratePlanId}".`,
      );
    }

    if (input.tiers.length === 0) {
      throw new InvalidPricingInputError(`Rate plan "${input.ratePlanId}" must have at least one tier.`);
    }

    for (const tier of input.tiers) {
      this.validateTier({
        ratePlanId: input.ratePlanId,
        tier,
      });
    }
  }

  private validateTier(input: { ratePlanId: string; tier: BasePricingRatePlanTierInput }): void {
    const { ratePlanId, tier } = input;

    if (!tier.id.trim()) {
      throw new InvalidPricingInputError(`Rate plan tier id is required for rate plan "${ratePlanId}".`);
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
