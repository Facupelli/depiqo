import { randomUUID } from 'node:crypto';

import { PricePerUnit } from './value-objects/price-per-unit.value-object';
import { RatePlanTierRange } from './value-objects/rate-plan-tier-range.value-object';

export class RatePlanTier {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly ratePlanId: string,
    public readonly range: RatePlanTierRange,
    public readonly pricePerUnit: PricePerUnit,
  ) {}

  static create(props: {
    tenantId: string;
    ratePlanId: string;
    range: RatePlanTierRange;
    pricePerUnit: PricePerUnit;
  }): RatePlanTier {
    return new RatePlanTier(randomUUID(), props.tenantId, props.ratePlanId, props.range, props.pricePerUnit);
  }

  static reconstitute(props: {
    id: string;
    tenantId: string;
    ratePlanId: string;
    range: RatePlanTierRange;
    pricePerUnit: PricePerUnit;
  }): RatePlanTier {
    return new RatePlanTier(props.id, props.tenantId, props.ratePlanId, props.range, props.pricePerUnit);
  }
}
