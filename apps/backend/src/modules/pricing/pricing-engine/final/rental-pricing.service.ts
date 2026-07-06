import { PricingInput } from './pricing-input.types';
import { PricingResult } from './pricing-result.type';
import { CouponValidationService } from '../coupons/coupon-validation.service';
import { PricingContextFactory } from './pricing-context.factory';
import { PricingResultAssembler } from './pricing-result-assembler';
import { PromotionApplicationPlanner } from '../promotions/promotion-application-planner';
import { PromotionApplierService } from '../promotions/promotion-applier.service';
import { PromotionEligibilityService } from '../promotions/promotion-elegibility.service';
import { BaseRentalPricingService } from '../base/base-rental-pricing.service';
import { AppliedPromotion } from '../promotions/applied-promotion.type';

export class RentalPricingService {
  constructor(
    private readonly basePricingService = new BaseRentalPricingService(),
    private readonly contextFactory = new PricingContextFactory(),
    private readonly promotionEligibilityService = new PromotionEligibilityService(),
    private readonly couponValidationService = new CouponValidationService(),
    private readonly applicationPlanner = new PromotionApplicationPlanner(),
    private readonly promotionApplier = new PromotionApplierService(),
    private readonly resultAssembler = new PricingResultAssembler(),
  ) {}

  calculate(input: PricingInput): PricingResult {
    const baseResult = this.basePricingService.calculate(input);

    const context = this.contextFactory.create({
      input,
      baseResult,
    });

    const eligibleAutomaticPromotions = this.promotionEligibilityService.getEligiblePromotions({
      context,
      promotions: input.automaticPromotions,
      activation: 'AUTOMATIC',
    });

    const eligibleCouponPromotion = this.couponValidationService.validate({
      context,
      couponCode: input.couponCode,
      coupon: input.coupon,
    });

    const candidatePromotions = [
      ...eligibleAutomaticPromotions,
      ...(eligibleCouponPromotion ? [eligibleCouponPromotion] : []),
    ];

    const plannedPromotions = this.applicationPlanner.plan({
      eligiblePromotions: candidatePromotions,
    });

    const appliedPromotions: AppliedPromotion[] = [];

    for (const eligiblePromotion of plannedPromotions) {
      const isCouponPromotion = eligibleCouponPromotion?.promotion.id === eligiblePromotion.promotion.id;

      const appliedAmount = this.promotionApplier.apply({
        context,
        eligiblePromotion,
        adjustmentType: isCouponPromotion ? 'COUPON' : 'PROMOTION',
        couponId: isCouponPromotion ? input.coupon?.id : undefined,
      });

      if (appliedAmount.isZero()) {
        continue;
      }

      appliedPromotions.push({
        promotion: eligiblePromotion.promotion,
        adjustmentType: isCouponPromotion ? 'COUPON' : 'PROMOTION',
        couponId: isCouponPromotion ? input.coupon?.id : undefined,
        couponCode: isCouponPromotion ? input.coupon?.code : undefined,
        amount: appliedAmount,
      });
    }

    return this.resultAssembler.assemble({
      context,
      appliedPromotions,
    });
  }
}
