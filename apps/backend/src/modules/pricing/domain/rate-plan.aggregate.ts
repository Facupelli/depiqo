import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import {
  DuplicateRatePlanTierFromUnitError,
  InvalidRatePlanNameError,
  MultipleOpenEndedRatePlanTiersError,
  NonContiguousRatePlanTiersError,
  OverlappingRatePlanTiersError,
  RatePlanDomainError,
  RatePlanMustHaveAtLeastOneTierError,
} from './errors/rate-plan.errors';
import { RatePlanTier } from './rate-plan-tier.entity';
import { CurrencyCode } from './value-objects/currency-code.value-object';
import { PricePerUnit } from './value-objects/price-per-unit.value-object';
import { RatePlanTierRange } from './value-objects/rate-plan-tier-range.value-object';
import { V2BillingUnit } from 'src/generated/prisma/client';

export class RatePlan {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly billingUnit: V2BillingUnit,
    public readonly currency: CurrencyCode,
    public readonly isActive: boolean,
    public readonly tiers: RatePlanTier[],
  ) {}

  static create(props: {
    tenantId: string;
    name: string;
    billingUnit: V2BillingUnit;
    currency: string;
    isActive: boolean;
    tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
  }): Result<RatePlan, RatePlanDomainError> {
    return RatePlan.build({ ...props, id: randomUUID() });
  }

  correct(props: {
    name: string;
    billingUnit: V2BillingUnit;
    currency: string;
    tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
  }): Result<RatePlan, RatePlanDomainError> {
    return RatePlan.build({
      ...props,
      id: this.id,
      tenantId: this.tenantId,
      isActive: this.isActive,
    });
  }

  private static build(props: {
    id: string;
    tenantId: string;
    name: string;
    billingUnit: V2BillingUnit;
    currency: string;
    isActive: boolean;
    tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
  }): Result<RatePlan, RatePlanDomainError> {
    const name = props.name.trim();
    if (!name) {
      return err(new InvalidRatePlanNameError());
    }

    const currency = CurrencyCode.create(props.currency);
    if (currency.isErr()) {
      return err(currency.error);
    }

    if (props.tiers.length === 0) {
      return err(new RatePlanMustHaveAtLeastOneTierError());
    }

    const tiers: RatePlanTier[] = [];
    for (const tierInput of props.tiers) {
      const range = RatePlanTierRange.create({ fromUnit: tierInput.fromUnit, toUnit: tierInput.toUnit });
      if (range.isErr()) {
        return err(range.error);
      }

      const pricePerUnit = PricePerUnit.create(tierInput.pricePerUnit);
      if (pricePerUnit.isErr()) {
        return err(pricePerUnit.error);
      }

      tiers.push(
        RatePlanTier.create({
          tenantId: props.tenantId,
          ratePlanId: props.id,
          range: range.value,
          pricePerUnit: pricePerUnit.value,
        }),
      );
    }

    const tierValidationError = RatePlan.validateTiers(tiers);
    if (tierValidationError) {
      return err(tierValidationError);
    }

    return ok(new RatePlan(props.id, props.tenantId, name, props.billingUnit, currency.value, props.isActive, tiers));
  }

  static reconstitute(props: {
    id: string;
    tenantId: string;
    name: string;
    billingUnit: V2BillingUnit;
    currency: CurrencyCode;
    isActive: boolean;
    tiers: RatePlanTier[];
  }): RatePlan {
    return new RatePlan(
      props.id,
      props.tenantId,
      props.name,
      props.billingUnit,
      props.currency,
      props.isActive,
      props.tiers,
    );
  }

  private static validateTiers(tiers: RatePlanTier[]): RatePlanDomainError | null {
    const sortedTiers = [...tiers].sort((a, b) => a.range.fromUnit - b.range.fromUnit);
    const seenFromUnits = new Set<number>();
    let openEndedTierCount = 0;
    let expectedFromUnit = 1;

    for (const tier of sortedTiers) {
      if (seenFromUnits.has(tier.range.fromUnit)) {
        return new DuplicateRatePlanTierFromUnitError(tier.range.fromUnit);
      }
      seenFromUnits.add(tier.range.fromUnit);

      if (tier.range.fromUnit !== expectedFromUnit) {
        return new NonContiguousRatePlanTiersError(expectedFromUnit, tier.range.fromUnit);
      }

      const toUnit = tier.range.toUnit;
      if (toUnit === null) {
        openEndedTierCount += 1;
        if (openEndedTierCount > 1) {
          return new MultipleOpenEndedRatePlanTiersError();
        }
        expectedFromUnit = Number.POSITIVE_INFINITY;
        continue;
      }

      if (expectedFromUnit === Number.POSITIVE_INFINITY) {
        return new OverlappingRatePlanTiersError();
      }

      expectedFromUnit = toUnit + 1;
    }

    return null;
  }
}
