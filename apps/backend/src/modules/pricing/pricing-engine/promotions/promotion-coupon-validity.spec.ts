import { Money } from '../money/money.value-object';
import { CouponValidationService } from '../coupons/coupon-validation.service';
import { CouponNotApplicableError } from '../errors/pricing.errors';
import { PricingContext } from '../final/pricing-context.types';
import { PromotionEligibilityService } from './promotion-elegibility.service';
import { PromotionPricingInput } from './promotion-input.types';

function context(calculationLocalDate: string): PricingContext {
  return {
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    currency: 'ARS',
    subtotal: Money.of('100', 'ARS'),
    discountTotal: Money.zero('ARS'),
    total: Money.of('100', 'ARS'),
    chargedDays: 1,
    calculationDate: new Date('2026-08-10T02:30:00.000Z'),
    calculationLocalDate,
    durationPolicySnapshot: {
      timezone: 'America/Argentina/Buenos_Aires',
      dailyBillingPolicy: 'BILL_ANY_PARTIAL_DAY',
      minimumChargedDays: 1,
    },
    lines: [
      {
        rentalSelectionId: 'selection-1',
        rentalOfferId: 'offer-1',
        rentableItemId: 'item-1',
        rentableItemName: 'Item',
        quantity: 1,
        chargedUnits: 1,
        billingUnit: 'DAY',
        ratePlanId: 'rate-plan-1',
        appliedTierId: 'tier-1',
        pricePerUnit: Money.of('100', 'ARS'),
        subtotal: Money.of('100', 'ARS'),
        discountTotal: Money.zero('ARS'),
        total: Money.of('100', 'ARS'),
        appliedAdjustments: [],
      },
    ],
  };
}

function promotion(overrides: Partial<PromotionPricingInput> = {}): PromotionPricingInput {
  return {
    id: 'promotion-1',
    tenantId: 'tenant-1',
    name: 'Promotion',
    activation: 'AUTOMATIC',
    priority: 0,
    stackable: false,
    isActive: true,
    validFrom: '2026-08-10',
    validUntil: '2026-08-10',
    effectType: 'PERCENTAGE_OFF',
    effectValue: '10',
    target: 'ORDER',
    scopes: [{ appliesToAll: true }],
    exclusions: [],
    ...overrides,
  };
}

describe('promotion and coupon local-date eligibility', () => {
  it('applies a promotion on its inclusive same-day window only', () => {
    const service = new PromotionEligibilityService();

    expect(
      service.getEligiblePromotions({
        context: context('2026-08-09'),
        promotions: [promotion()],
        activation: 'AUTOMATIC',
      }),
    ).toEqual([]);
    expect(
      service.getEligiblePromotions({
        context: context('2026-08-10'),
        promotions: [promotion()],
        activation: 'AUTOMATIC',
      }),
    ).toHaveLength(1);
  });

  it('applies coupon validity using the same inclusive local-date semantics', () => {
    const service = new CouponValidationService();
    const couponPromotion = promotion({ activation: 'COUPON_REQUIRED', validFrom: null, validUntil: null });
    const coupon = {
      id: 'coupon-1',
      tenantId: 'tenant-1',
      promotionId: couponPromotion.id,
      code: 'LOCAL-DATE',
      isActive: true,
      validFrom: '2026-08-10',
      validUntil: '2026-08-10',
      currentTotalRedemptions: 0,
      promotion: couponPromotion,
    };

    expect(service.validate({ context: context('2026-08-10'), couponCode: 'LOCAL-DATE', coupon })).not.toBeNull();
    expect(() => service.validate({ context: context('2026-08-11'), couponCode: 'LOCAL-DATE', coupon })).toThrow(
      CouponNotApplicableError,
    );
  });
});
