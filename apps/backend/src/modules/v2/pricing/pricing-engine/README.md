1. BaseRentalPricingService calculates undiscounted line prices.
2. PricingContextFactory converts base result into Money-based context.
3. PromotionEligibilityService finds eligible automatic promotions.
4. CouponValidationService validates optional coupon.
5. PromotionApplicationPlanner orders promotions by priority/stackability.
6. PromotionApplierService applies discounts and allocations.
7. PricingResultAssembler returns final snapshot.
