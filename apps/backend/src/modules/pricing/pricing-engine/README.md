1. BaseRentalPricingService calculates exact undiscounted charges, settles the order half-up, and allocates payable cents to lines by largest remainder (stable Rental Offer identity ties).
2. PricingContextFactory converts base result into Money-based context.
3. PromotionEligibilityService finds eligible automatic promotions.
4. CouponValidationService validates optional coupon.
5. PromotionApplicationPlanner orders promotions by priority; the engine rejects ambiguous equal-priority positive effects.
6. PromotionApplierService rounds each positive aggregate discount half-up and allocates payable cents to eligible lines; RentalPricingService stops at an applied non-stackable promotion.
7. PricingResultAssembler returns final snapshot.
