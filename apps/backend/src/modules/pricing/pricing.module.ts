import { Module } from '@nestjs/common';

import { PricingContextLoader } from './application/pricing-context-loader';
import { AttachRatePlanToRentalOfferOperation } from './application/operations/attach-rate-plan-to-rental-offer.operation';
import { CreateRatePlanOperation } from './application/operations/create-rate-plan.operation';
import { AttachRatePlanToRentalOfferHttpController } from './features/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.controller';
import { AttachRatePlanToRentalOfferHandler } from './features/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.handler';
import { CalculateCartPriceHttpController } from './features/calculate-cart-price/calculate-cart-price.controller';
import { CalculateCartPriceHandler } from './features/calculate-cart-price/calculate-cart-price.handler';
import { CalculateDraftRentalPriceHttpController } from './features/calculate-draft-rental-price/calculate-draft-rental-price.controller';
import { CalculateDraftRentalPriceHandler } from './features/calculate-draft-rental-price/calculate-draft-rental-price.handler';
import { CorrectRatePlanHttpController } from './features/correct-rate-plan/correct-rate-plan.controller';
import { CorrectRatePlanHandler } from './features/correct-rate-plan/correct-rate-plan.handler';
import { DetachOfferPricingHttpController } from './features/detach-offer-pricing/detach-offer-pricing.controller';
import { DetachOfferPricingHandler } from './features/detach-offer-pricing/detach-offer-pricing.handler';
import { CreatePromotionHttpController } from './features/create-promotion/create-promotion.controller';
import { CreatePromotionHandler } from './features/create-promotion/create-promotion.handler';
import { CreateRatePlanHttpController } from './features/create-rate-plan/create-rate-plan.controller';
import { CreateRatePlanHandler } from './features/create-rate-plan/create-rate-plan.handler';
import { GetPromotionDetailHttpController } from './features/get-promotion-detail/get-promotion-detail.controller';
import { GetPromotionDetailHandler } from './features/get-promotion-detail/get-promotion-detail.handler';
import { GetPromotionsHttpController } from './features/get-promotions/get-promotions.controller';
import { GetPromotionsHandler } from './features/get-promotions/get-promotions.handler';
import { GetRatePlanDetailHttpController } from './features/get-rate-plan-detail/get-rate-plan-detail.controller';
import { GetRatePlanDetailHandler } from './features/get-rate-plan-detail/get-rate-plan-detail.handler';
import { GetRatePlansHttpController } from './features/get-rate-plans/get-rate-plans.controller';
import { GetRatePlansHandler } from './features/get-rate-plans/get-rate-plans.handler';
import { GetRentalOffersPricingHttpController } from './features/get-rental-offers-pricing/get-rental-offers-pricing.controller';
import { GetRentalOffersPricingHandler } from './features/get-rental-offers-pricing/get-rental-offers-pricing.handler';
import { GetStorefrontRentalOffersPricingHttpController } from './features/get-storefront-rental-offers-pricing/get-storefront-rental-offers-pricing.controller';
import { GetStorefrontRentalOffersPricingHandler } from './features/get-storefront-rental-offers-pricing/get-storefront-rental-offers-pricing.handler';
import { UpdatePromotionHttpController } from './features/update-promotion/update-promotion.controller';
import { UpdatePromotionHandler } from './features/update-promotion/update-promotion.handler';
import { PriceDraftRentalService } from './features/price-draft-rental/price-draft-rental.service';
import { RatePlanRepository } from './persistence/rate-plan.repository';
import { PricingCalculationService } from './application/pricing-calculation.service';
import { PricingCalculation } from './public-api/pricing-calculation.public-api';
import { PricingRatePlanAuthoringService } from './public-api/pricing-rate-plan-authoring.service';
import { PricingRatePlanAuthoring } from './public-api/pricing-rate-plan-authoring.public-api';
import { PricingRentalOfferPricingAssignmentService } from './public-api/pricing-rental-offer-pricing-assignment.service';
import { PricingRentalOfferPricingAssignment } from './public-api/pricing-rental-offer-pricing-assignment.public-api';
import { CatalogModule } from '../catalog/catalog.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';

@Module({
  imports: [CatalogModule, TenantManagementModule],
  controllers: [
    AttachRatePlanToRentalOfferHttpController,
    CalculateCartPriceHttpController,
    CalculateDraftRentalPriceHttpController,
    CorrectRatePlanHttpController,
    DetachOfferPricingHttpController,
    CreatePromotionHttpController,
    CreateRatePlanHttpController,
    GetPromotionDetailHttpController,
    GetPromotionsHttpController,
    GetRatePlanDetailHttpController,
    GetRatePlansHttpController,
    GetRentalOffersPricingHttpController,
    GetStorefrontRentalOffersPricingHttpController,
    UpdatePromotionHttpController,
  ],
  providers: [
    AttachRatePlanToRentalOfferOperation,
    CalculateCartPriceHandler,
    CalculateDraftRentalPriceHandler,
    CorrectRatePlanHandler,
    DetachOfferPricingHandler,
    AttachRatePlanToRentalOfferHandler,
    CreateRatePlanOperation,
    CreatePromotionHandler,
    CreateRatePlanHandler,
    GetPromotionDetailHandler,
    GetPromotionsHandler,
    GetRatePlanDetailHandler,
    GetRatePlansHandler,
    GetRentalOffersPricingHandler,
    GetStorefrontRentalOffersPricingHandler,
    PricingContextLoader,
    PriceDraftRentalService,
    RatePlanRepository,
    UpdatePromotionHandler,
    { provide: PricingCalculation, useClass: PricingCalculationService },
    { provide: PricingRatePlanAuthoring, useClass: PricingRatePlanAuthoringService },
    { provide: PricingRentalOfferPricingAssignment, useClass: PricingRentalOfferPricingAssignmentService },
  ],
  exports: [PricingCalculation, PricingRatePlanAuthoring, PricingRentalOfferPricingAssignment],
})
export class PricingModule {}
