import { Prisma, V2BillingUnit } from 'src/generated/prisma/client';

import { RatePlan } from '../domain/rate-plan.aggregate';
import { RatePlanTier } from '../domain/rate-plan-tier.entity';
import { CurrencyCode } from '../domain/value-objects/currency-code.value-object';
import { PricePerUnit } from '../domain/value-objects/price-per-unit.value-object';
import { RatePlanTierRange } from '../domain/value-objects/rate-plan-tier-range.value-object';

type RatePlanRecord = Prisma.V2RatePlanGetPayload<{ include: { tiers: true } }>;

export class RatePlanMapper {
  static toDomain(record: RatePlanRecord): RatePlan {
    const currency = CurrencyCode.create(record.currency);
    if (currency.isErr()) {
      throw currency.error;
    }

    return RatePlan.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      billingUnit: record.billingUnit,
      currency: currency.value,
      isActive: record.isActive,
      tiers: record.tiers.map((tier) => {
        const range = RatePlanTierRange.create({ fromUnit: tier.fromUnit, toUnit: tier.toUnit });
        if (range.isErr()) {
          throw range.error;
        }

        const pricePerUnit = PricePerUnit.create(String(tier.pricePerUnit));
        if (pricePerUnit.isErr()) {
          throw pricePerUnit.error;
        }

        return RatePlanTier.reconstitute({
          id: tier.id,
          tenantId: tier.tenantId,
          ratePlanId: tier.ratePlanId,
          range: range.value,
          pricePerUnit: pricePerUnit.value,
        });
      }),
    });
  }

  static toCreateData(ratePlan: RatePlan): Prisma.V2RatePlanCreateInput {
    return {
      id: ratePlan.id,
      tenantId: ratePlan.tenantId,
      name: ratePlan.name,
      billingUnit: ratePlan.billingUnit as V2BillingUnit,
      currency: ratePlan.currency.value,
      isActive: ratePlan.isActive,
      tiers: {
        create: ratePlan.tiers.map((tier) => ({
          id: tier.id,
          tenantId: tier.tenantId,
          fromUnit: tier.range.fromUnit,
          toUnit: tier.range.toUnit,
          pricePerUnit: tier.pricePerUnit.toString(),
        })),
      },
    };
  }
}
