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
import { CreatePromotionHttpController } from './features/create-promotion/create-promotion.controller';
import { CreatePromotionHandler } from './features/create-promotion/create-promotion.handler';
import { CreateRatePlanAndAttachToRentalOfferHttpController } from './features/create-rate-plan-and-attach-to-rental-offer/create-rate-plan-and-attach-to-rental-offer.controller';
import { CreateRatePlanAndAttachToRentalOfferHandler } from './features/create-rate-plan-and-attach-to-rental-offer/create-rate-plan-and-attach-to-rental-offer.handler';
import { CreateRatePlanHttpController } from './features/create-rate-plan/create-rate-plan.controller';
import { CreateRatePlanHandler } from './features/create-rate-plan/create-rate-plan.handler';
import { GetPromotionDetailHttpController } from './features/get-promotion-detail/get-promotion-detail.controller';
import { GetPromotionDetailHandler } from './features/get-promotion-detail/get-promotion-detail.handler';
import { GetPromotionsHttpController } from './features/get-promotions/get-promotions.controller';
import { GetPromotionsHandler } from './features/get-promotions/get-promotions.handler';
import { GetRentalOffersPricingHttpController } from './features/get-rental-offers-pricing/get-rental-offers-pricing.controller';
import { GetRentalOffersPricingHandler } from './features/get-rental-offers-pricing/get-rental-offers-pricing.handler';
import { GetStorefrontRentalOffersPricingHttpController } from './features/get-storefront-rental-offers-pricing/get-storefront-rental-offers-pricing.controller';
import { GetStorefrontRentalOffersPricingHandler } from './features/get-storefront-rental-offers-pricing/get-storefront-rental-offers-pricing.handler';
import { UpdatePromotionHttpController } from './features/update-promotion/update-promotion.controller';
import { UpdatePromotionHandler } from './features/update-promotion/update-promotion.handler';
import { PriceConfirmedRentalService } from './features/price-confirmed-rental/price-confirmed-rental.service';
import { PriceDraftRentalService } from './features/price-draft-rental/price-draft-rental.service';
import { RatePlanRepository } from './persistence/rate-plan.repository';
import { PricingPublicApiService } from './public-api/pricing-public-api.service';
import { PricingPublicApi } from './public-api/pricing.public-api';
import { CatalogModule } from '../catalog/catalog.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';

@Module({
  imports: [CatalogModule, TenantManagementModule],
  controllers: [
    AttachRatePlanToRentalOfferHttpController,
    CalculateCartPriceHttpController,
    CalculateDraftRentalPriceHttpController,
    CreatePromotionHttpController,
    CreateRatePlanAndAttachToRentalOfferHttpController,
    CreateRatePlanHttpController,
    GetPromotionDetailHttpController,
    GetPromotionsHttpController,
    GetRentalOffersPricingHttpController,
    GetStorefrontRentalOffersPricingHttpController,
    UpdatePromotionHttpController,
  ],
  providers: [
    AttachRatePlanToRentalOfferOperation,
    CalculateCartPriceHandler,
    CalculateDraftRentalPriceHandler,
    AttachRatePlanToRentalOfferHandler,
    CreateRatePlanOperation,
    CreatePromotionHandler,
    CreateRatePlanAndAttachToRentalOfferHandler,
    CreateRatePlanHandler,
    GetPromotionDetailHandler,
    GetPromotionsHandler,
    GetRentalOffersPricingHandler,
    GetStorefrontRentalOffersPricingHandler,
    PricingContextLoader,
    PriceConfirmedRentalService,
    PriceDraftRentalService,
    RatePlanRepository,
    UpdatePromotionHandler,
    { provide: PricingPublicApi, useClass: PricingPublicApiService },
  ],
  exports: [PricingPublicApi],
})
export class PricingModule {}
