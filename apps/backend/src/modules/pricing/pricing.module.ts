import { Module } from '@nestjs/common';

import { PricingContextLoader } from './application/pricing-context-loader';
import { AttachRatePlanToRentalOfferOperation } from './application/operations/attach-rate-plan-to-rental-offer.operation';
import { CreatePricingForRentalOfferOperation } from './application/operations/create-pricing-for-rental-offer.operation';
import { CreateRatePlanOperation } from './application/operations/create-rate-plan.operation';
import { AttachRatePlanToRentalOfferHttpController } from './features/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.controller';
import { AttachRatePlanToRentalOfferHandler } from './features/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.handler';
import { CalculateDraftRentalPriceHttpController } from './features/calculate-draft-rental-price/calculate-draft-rental-price.controller';
import { CalculateDraftRentalPriceHandler } from './features/calculate-draft-rental-price/calculate-draft-rental-price.handler';
import { CorrectRatePlanHttpController } from './features/correct-rate-plan/correct-rate-plan.controller';
import { CorrectRatePlanHandler } from './features/correct-rate-plan/correct-rate-plan.handler';
import { DetachOfferPricingHttpController } from './features/detach-offer-pricing/detach-offer-pricing.controller';
import { DetachOfferPricingHandler } from './features/detach-offer-pricing/detach-offer-pricing.handler';
import { CreatePromotionHttpController } from './features/create-promotion/create-promotion.controller';
import { CreatePromotionHandler } from './features/create-promotion/create-promotion.handler';
import { CreatePricingForRentalOfferHttpController } from './features/create-pricing-for-rental-offer/create-pricing-for-rental-offer.controller';
import { CreatePricingForRentalOfferHandler } from './features/create-pricing-for-rental-offer/create-pricing-for-rental-offer.handler';
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
import { RatePlanRepository } from './persistence/rate-plan.repository';
import { PricingCalculationService } from './application/pricing-calculation.service';
import { PricingCalculation } from './public-api/pricing-calculation.public-api';
import { PricingRatePlanAuthoringService } from './public-api/pricing-rate-plan-authoring.service';
import { PricingRatePlanAuthoring } from './public-api/pricing-rate-plan-authoring.public-api';
import { PricingRentalOfferPricingAssignmentService } from './public-api/pricing-rental-offer-pricing-assignment.service';
import { PricingRentalOfferPricingAssignment } from './public-api/pricing-rental-offer-pricing-assignment.public-api';
import { PricingTargetTotalAdjustment } from './public-api/pricing-target-total-adjustment.public-api';
import { PricingTargetTotalAdjustmentService } from './public-api/pricing-target-total-adjustment.service';
import { CatalogModule } from '../catalog/catalog.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { PricingRentalOfferStartingPriceFacts } from './public-api/pricing-rental-offer-starting-price-facts.public-api';
import { PricingRentalOfferStartingPriceFactsService } from './public-api/pricing-rental-offer-starting-price-facts.service';

@Module({
  imports: [CatalogModule, TenantManagementModule],
  controllers: [
    AttachRatePlanToRentalOfferHttpController,
    CalculateDraftRentalPriceHttpController,
    CorrectRatePlanHttpController,
    DetachOfferPricingHttpController,
    CreatePromotionHttpController,
    CreatePricingForRentalOfferHttpController,
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
    CalculateDraftRentalPriceHandler,
    CorrectRatePlanHandler,
    DetachOfferPricingHandler,
    AttachRatePlanToRentalOfferHandler,
    CreatePricingForRentalOfferOperation,
    CreateRatePlanOperation,
    CreatePromotionHandler,
    CreatePricingForRentalOfferHandler,
    CreateRatePlanHandler,
    GetPromotionDetailHandler,
    GetPromotionsHandler,
    GetRatePlanDetailHandler,
    GetRatePlansHandler,
    GetRentalOffersPricingHandler,
    GetStorefrontRentalOffersPricingHandler,
    PricingContextLoader,
    RatePlanRepository,
    UpdatePromotionHandler,
    { provide: PricingCalculation, useClass: PricingCalculationService },
    { provide: PricingRatePlanAuthoring, useClass: PricingRatePlanAuthoringService },
    { provide: PricingRentalOfferPricingAssignment, useClass: PricingRentalOfferPricingAssignmentService },
    { provide: PricingTargetTotalAdjustment, useClass: PricingTargetTotalAdjustmentService },
    {
      provide: PricingRentalOfferStartingPriceFacts,
      useClass: PricingRentalOfferStartingPriceFactsService,
    },
  ],
  exports: [
    PricingCalculation,
    PricingRatePlanAuthoring,
    PricingRentalOfferPricingAssignment,
    PricingTargetTotalAdjustment,
    PricingRentalOfferStartingPriceFacts,
  ],
})
export class PricingModule {}
