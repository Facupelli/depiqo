import { Module } from '@nestjs/common';

import { GeocodingModule } from '../shared/geocoding/geocoding.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { RoadRouteDistanceProvider } from './application/ports/road-route-distance-provider.port';
import { DeliveryQuoteService } from './public-api/delivery-quote.public-api';
import { DeliveryQuoteServiceImpl } from './public-api/delivery-quote.service';
import { MapboxDirectionsHttpClient } from './infrastructure/mapbox/mapbox-directions-http.client';
import { MapboxRoadRouteDistanceProviderAdapter } from './infrastructure/mapbox/mapbox-road-route-distance-provider.adapter';
import { BranchDeliveryConfigurationRepository } from './persistence/branch-delivery-configuration.repository';

@Module({
  imports: [GeocodingModule, TenantManagementModule],
  providers: [
    BranchDeliveryConfigurationRepository,
    MapboxDirectionsHttpClient,
    MapboxRoadRouteDistanceProviderAdapter,
    { provide: RoadRouteDistanceProvider, useExisting: MapboxRoadRouteDistanceProviderAdapter },
    { provide: DeliveryQuoteService, useClass: DeliveryQuoteServiceImpl },
  ],
  exports: [DeliveryQuoteService],
})
export class DeliveryModule {}
