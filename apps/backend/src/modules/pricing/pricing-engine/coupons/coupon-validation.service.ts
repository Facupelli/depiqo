import { CouponNotApplicableError, InvalidCouponError } from '../errors/pricing.errors';
import { CouponPricingInput } from './coupon-input.types';
import { EligiblePromotion } from '../promotions/promotion-elegibility.type';
import { PromotionEligibilityService } from '../promotions/promotion-elegibility.service';
import { ValidityWindowChecker } from '../shared/validity-window-checker';
import { PricingContext } from '../final/pricing-context.types';

type CouponValidationServiceInput = {
  context: PricingContext;
  couponCode?: string;
  coupon?: CouponPricingInput;
};

export class CouponValidationService {
  constructor(
    private readonly validityWindowChecker = new ValidityWindowChecker(),
    private readonly promotionEligibilityService = new PromotionEligibilityService(),
  ) {}

  validate(input: CouponValidationServiceInput): EligiblePromotion | null {
    const { context, couponCode, coupon } = input;

    if (!couponCode) {
      return null;
    }

    if (!coupon) {
      throw new CouponNotApplicableError(`Coupon "${couponCode}" was not found or is not available.`);
    }

    this.validateCouponShape(coupon);

    if (coupon.tenantId !== context.tenantId) {
      throw new CouponNotApplicableError(`Coupon "${couponCode}" is not available for this tenant.`);
    }

    if (coupon.code.trim().toUpperCase() !== couponCode.trim().toUpperCase()) {
      throw new CouponNotApplicableError(`Coupon "${couponCode}" does not match the resolved coupon.`);
    }

    if (!coupon.isActive) {
      throw new CouponNotApplicableError(`Coupon "${couponCode}" is not active.`);
    }

    if (
      !this.validityWindowChecker.isWithinWindow({
        localDate: context.calculationLocalDate,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
      })
    ) {
      throw new CouponNotApplicableError(`Coupon "${couponCode}" is not valid for this date.`);
    }

    if (coupon.restrictedToCustomerId && coupon.restrictedToCustomerId !== context.customerId) {
      throw new CouponNotApplicableError(`Coupon "${couponCode}" is restricted to another customer.`);
    }

    if (coupon.maxUsesPerCustomer != null && !context.customerId) {
      throw new CouponNotApplicableError(`Coupon "${couponCode}" requires customer information.`);
    }

    if (coupon.maxUses != null && coupon.currentTotalRedemptions >= coupon.maxUses) {
      throw new CouponNotApplicableError(`Coupon "${couponCode}" has reached its maximum usage limit.`);
    }

    if (
      coupon.maxUsesPerCustomer != null &&
      coupon.currentCustomerRedemptions != null &&
      coupon.currentCustomerRedemptions >= coupon.maxUsesPerCustomer
    ) {
      throw new CouponNotApplicableError(
        `Coupon "${couponCode}" has reached its maximum usage limit for this customer.`,
      );
    }

    if (coupon.promotionId !== coupon.promotion.id) {
      throw new InvalidCouponError(
        `Coupon "${coupon.id}" references promotion "${coupon.promotionId}", but resolved promotion is "${coupon.promotion.id}".`,
      );
    }

    if (coupon.promotion.activation !== 'COUPON_REQUIRED') {
      throw new CouponNotApplicableError(`Coupon "${couponCode}" does not activate a coupon-required promotion.`);
    }

    const eligibleCouponPromotions = this.promotionEligibilityService.getEligiblePromotions({
      context,
      promotions: [coupon.promotion],
      activation: 'COUPON_REQUIRED',
    });

    if (eligibleCouponPromotions.length === 0) {
      throw new CouponNotApplicableError(`Coupon "${couponCode}" is valid but does not apply to this order.`);
    }

    return eligibleCouponPromotions[0];
  }

  private validateCouponShape(coupon: CouponPricingInput): void {
    if (!coupon.id.trim()) {
      throw new InvalidCouponError('Coupon id is required.');
    }

    if (!coupon.tenantId.trim()) {
      throw new InvalidCouponError(`Tenant id is required for coupon "${coupon.id}".`);
    }

    if (!coupon.promotionId.trim()) {
      throw new InvalidCouponError(`Promotion id is required for coupon "${coupon.id}".`);
    }

    if (!coupon.code.trim()) {
      throw new InvalidCouponError(`Coupon code is required for coupon "${coupon.id}".`);
    }

    if (!Number.isInteger(coupon.currentTotalRedemptions) || coupon.currentTotalRedemptions < 0) {
      throw new InvalidCouponError(
        `Current total redemptions must be a non-negative integer for coupon "${coupon.id}".`,
      );
    }

    if (
      coupon.currentCustomerRedemptions != null &&
      (!Number.isInteger(coupon.currentCustomerRedemptions) || coupon.currentCustomerRedemptions < 0)
    ) {
      throw new InvalidCouponError(
        `Current customer redemptions must be a non-negative integer for coupon "${coupon.id}".`,
      );
    }

    if (coupon.maxUses != null && (!Number.isInteger(coupon.maxUses) || coupon.maxUses < 1)) {
      throw new InvalidCouponError(`Coupon "${coupon.id}" maxUses must be a positive integer.`);
    }

    if (
      coupon.maxUsesPerCustomer != null &&
      (!Number.isInteger(coupon.maxUsesPerCustomer) || coupon.maxUsesPerCustomer < 1)
    ) {
      throw new InvalidCouponError(`Coupon "${coupon.id}" maxUsesPerCustomer must be a positive integer.`);
    }
  }
}
