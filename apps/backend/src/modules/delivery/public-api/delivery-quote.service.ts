import { Injectable } from '@nestjs/common';

import { AddressGeocoder } from '../../shared/geocoding/address-geocoder.port';
import type { GeocodedLocation } from '../../shared/geocoding/geocoded-location';
import { BranchFacts } from '../../tenant-management/public-api/branch-facts.public-api';
import { RoadRouteDistanceProvider } from '../application/ports/road-route-distance-provider.port';
import { DeliveryQuoteCalculator } from '../domain/delivery-quote-calculator';
import { BranchDeliveryConfigurationRepository } from '../persistence/branch-delivery-configuration.repository';
import { DeliveryQuoteOutcome, DeliveryQuoteService, GetDeliveryQuoteInput } from './delivery-quote.public-api';

@Injectable()
export class DeliveryQuoteServiceImpl extends DeliveryQuoteService {
  private readonly calculator = new DeliveryQuoteCalculator();

  constructor(
    private readonly configurations: BranchDeliveryConfigurationRepository,
    private readonly branchFacts: BranchFacts,
    private readonly addressGeocoder: AddressGeocoder,
    private readonly roadRouteDistanceProvider: RoadRouteDistanceProvider,
  ) {
    super();
  }

  async getQuote(input: GetDeliveryQuoteInput): Promise<DeliveryQuoteOutcome> {
    const configuration = await this.configurations.findByTenantAndBranch(input.tenantId, input.branchId);
    if (!configuration) return { serviceable: false, reason: 'NOT_CONFIGURED' };
    if (!configuration.enabled) return { serviceable: false, reason: 'DISABLED' };

    const branchResult = await this.branchFacts.getBranchFacts({
      tenantId: input.tenantId,
      branchId: input.branchId,
    });
    if (branchResult.isErr()) {
      if (branchResult.error.code === 'BranchNotFound') {
        return { serviceable: false, reason: 'BRANCH_UNAVAILABLE' };
      }
      throw branchResult.error;
    }

    const branch = branchResult.value;
    if (!branch.isActive || branch.isDeleted) {
      return { serviceable: false, reason: 'BRANCH_UNAVAILABLE' };
    }
    if (!branch.operationalLocation) {
      return { serviceable: false, reason: 'BRANCH_LOCATION_MISSING' };
    }

    const customerLocation = await this.resolveCustomerLocation(input);
    if ('reason' in customerLocation) {
      return { serviceable: false, reason: customerLocation.reason };
    }

    const route = await this.roadRouteDistanceProvider.getDrivingDistance({
      origin: {
        latitude: branch.operationalLocation.latitude,
        longitude: branch.operationalLocation.longitude,
      },
      destination: {
        latitude: customerLocation.latitude,
        longitude: customerLocation.longitude,
      },
    });
    if (route.outcome === 'NO_ROUTE') return { serviceable: false, reason: 'NO_ROUTE' };

    const calculation = this.calculator.calculate({
      configuration,
      distanceMeters: route.distanceMeters,
      effectiveTimezone: branch.effectiveTimezone,
      resolvedCustomerLocation: {
        formattedAddress: customerLocation.formattedAddress,
        latitude: customerLocation.latitude,
        longitude: customerLocation.longitude,
        addressLine1: customerLocation.street,
        city: customerLocation.city,
        state: customerLocation.stateRegion,
        postalCode: customerLocation.postalCode,
        country: customerLocation.country,
        providerPlaceId: customerLocation.providerPlaceId,
      },
      rentalStart: input.rentalStart,
      rentalEnd: input.rentalEnd,
      calculatedAt: new Date(),
    });
    if (calculation.isErr()) {
      if ('code' in calculation.error) {
        return { serviceable: false, reason: calculation.error.code };
      }
      throw calculation.error;
    }

    return { serviceable: true, quote: calculation.value };
  }

  private async resolveCustomerLocation(
    input: GetDeliveryQuoteInput,
  ): Promise<
    | GeocodedLocation
    | { reason: 'CUSTOMER_LOCATION_UNRESOLVED' | 'CUSTOMER_LOCATION_AMBIGUOUS' }
  > {
    const locationId = input.customerLocation.locationId?.trim();
    if (locationId) {
      const location = await this.addressGeocoder.resolve({ locationId });
      return location ?? { reason: 'CUSTOMER_LOCATION_UNRESOLVED' };
    }

    const result = await this.addressGeocoder.geocode({ address: input.customerLocation.address });
    if (result.outcome === 'UNRESOLVED') {
      return { reason: 'CUSTOMER_LOCATION_UNRESOLVED' };
    }
    if (result.outcome === 'AMBIGUOUS') {
      return { reason: 'CUSTOMER_LOCATION_AMBIGUOUS' };
    }

    return result.location;
  }
}
