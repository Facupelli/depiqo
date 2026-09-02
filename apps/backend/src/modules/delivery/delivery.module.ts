import { Module } from '@nestjs/common';

import { GeocodingModule } from '../shared/geocoding/geocoding.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';

import { RoadRouteDistanceProvider } from './application/ports/road-route-distance-provider.port';
import { GeoapifyRoadRouteDistanceProviderAdapter } from './infrastructure/geoapify/geoapify-road-route-distance-provider.adapter';
import { BranchDeliveryConfigurationRepository } from './persistence/branch-delivery-configuration.repository';
import { DeliveryQuoteService } from './public-api/delivery-quote.public-api';
import { DeliveryQuoteServiceImpl } from './public-api/delivery-quote.service';
import { GeoapifyRoutingHttpClient } from './infrastructure/geoapify/geoapify-routing-http.client';

@Module({
  imports: [
    GeocodingModule,
    TenantManagementModule,
  ],
  providers: [
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
