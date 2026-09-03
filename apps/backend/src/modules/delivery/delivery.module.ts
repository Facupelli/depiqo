import { Module } from '@nestjs/common';

import { GeocodingModule } from '../shared/geocoding/geocoding.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';

import { RoadRouteDistanceProvider } from './application/ports/road-route-distance-provider.port';
import { GetBranchDeliveryConfigurationHttpController } from './features/get-branch-delivery-configuration/get-branch-delivery-configuration.controller';
import { GetBranchDeliveryConfigurationHandler } from './features/get-branch-delivery-configuration/get-branch-delivery-configuration.handler';
import { PutBranchDeliveryConfigurationHttpController } from './features/put-branch-delivery-configuration/put-branch-delivery-configuration.controller';
import { PutBranchDeliveryConfigurationHandler } from './features/put-branch-delivery-configuration/put-branch-delivery-configuration.handler';
import { SearchStorefrontDeliveryAddressSuggestionsHttpController } from './features/search-storefront-delivery-address-suggestions/search-storefront-delivery-address-suggestions.controller';
import { SearchStorefrontDeliveryAddressSuggestionsHandler } from './features/search-storefront-delivery-address-suggestions/search-storefront-delivery-address-suggestions.handler';
import { GeoapifyRoadRouteDistanceProviderAdapter } from './infrastructure/geoapify/geoapify-road-route-distance-provider.adapter';
import { BranchDeliveryConfigurationRepository } from './persistence/branch-delivery-configuration.repository';
import { DeliveryQuoteService } from './public-api/delivery-quote.public-api';
import { DeliveryQuoteServiceImpl } from './public-api/delivery-quote.service';
import { GeoapifyRoutingHttpClient } from './infrastructure/geoapify/geoapify-routing-http.client';

@Module({
  imports: [GeocodingModule, TenantManagementModule],
  controllers: [
    GetBranchDeliveryConfigurationHttpController,
    PutBranchDeliveryConfigurationHttpController,
    SearchStorefrontDeliveryAddressSuggestionsHttpController,
  ],
  providers: [
    GetBranchDeliveryConfigurationHandler,
    PutBranchDeliveryConfigurationHandler,
    SearchStorefrontDeliveryAddressSuggestionsHandler,
    BranchDeliveryConfigurationRepository,

    GeoapifyRoutingHttpClient,
    GeoapifyRoadRouteDistanceProviderAdapter,

    {
      provide: RoadRouteDistanceProvider,
      useExisting: GeoapifyRoadRouteDistanceProviderAdapter,
    },

    {
      provide: DeliveryQuoteService,
      useClass: DeliveryQuoteServiceImpl,
    },
  ],
  exports: [DeliveryQuoteService],
})
export class DeliveryModule {}
