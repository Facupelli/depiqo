import { Module } from '@nestjs/common';

import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { CustomerLocationResolver } from './application/ports/customer-location-resolver.port';
import { RoadRouteDistanceProvider } from './application/ports/road-route-distance-provider.port';
import { MapboxCustomerLocationResolverAdapter } from './infrastructure/mapbox/mapbox-customer-location-resolver.adapter';
import { MapboxHttpClient } from './infrastructure/mapbox/mapbox-http.client';
import { MapboxRoadRouteDistanceProviderAdapter } from './infrastructure/mapbox/mapbox-road-route-distance-provider.adapter';
import { BranchDeliveryConfigurationRepository } from './persistence/branch-delivery-configuration.repository';

@Module({
  imports: [TenantManagementModule],
  providers: [
    BranchDeliveryConfigurationRepository,
    MapboxHttpClient,
    MapboxCustomerLocationResolverAdapter,
    MapboxRoadRouteDistanceProviderAdapter,
    { provide: CustomerLocationResolver, useExisting: MapboxCustomerLocationResolverAdapter },
    { provide: RoadRouteDistanceProvider, useExisting: MapboxRoadRouteDistanceProviderAdapter },
  ],
})
export class DeliveryModule {}
