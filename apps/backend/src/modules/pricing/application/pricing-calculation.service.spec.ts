import { describe, expect, it } from 'vitest';
import { ok } from 'neverthrow';

import { TenantInsuranceOfferingTerms } from 'src/modules/tenant-management/public-api/tenant-insurance-offering-terms.public-api';
import { PricingCalculationService } from './pricing-calculation.service';
import { PricingContextLoader } from './pricing-context-loader';

describe('PricingCalculation insurance composition', () => {
  // SAFETY: Insurance composition never accesses the pricing context loader.
  const pricing = new PricingCalculationService({} as PricingContextLoader, {
    getTenantInsuranceOfferingTerms: async () => ok({ insuranceEnabled: true, insuranceRatePercent: 50 }),
  } satisfies TenantInsuranceOfferingTerms);

  it('rounds a half-cent insurance amount once and adds the settled charge', async () => {
    const result = await pricing.calculateInsuranceForEquipmentPrice({
      tenantId: 'tenant',
      currency: 'USD',
      insuranceSelected: true,
      equipmentSubtotalBeforeDiscounts: '0.01',
      equipmentTotal: '0.01',
    });
    expect(result.isOk() && result.value).toEqual({
      insurance: { applied: true, amount: '0.01' },
      totalBeforeInsurance: '0.01',
      total: '0.02',
    });
  });

  it('does not lose cents when composing very large monetary totals', async () => {
    const total = '9007199254740993.01';
    const result = await pricing.calculateInsuranceForEquipmentPrice({
      tenantId: 'tenant',
      currency: 'EUR',
      insuranceSelected: true,
      equipmentSubtotalBeforeDiscounts: '0.01',
      equipmentTotal: total,
    });
    expect(result.isOk() && result.value.total).toBe('9007199254740993.02');
  });

  it('rejects a monetary edit of a historical unsupported-currency snapshot', async () => {
    const result = await pricing.calculateInsuranceForEquipmentPrice({
      tenantId: 'tenant',
      currency: 'JPY',
      insuranceSelected: true,
      equipmentSubtotalBeforeDiscounts: '1.00',
      equipmentTotal: '1.00',
    });
    expect(result.isErr() && result.error.code).toBe('pricing_calculation.unsupported_currency');
  });
});
