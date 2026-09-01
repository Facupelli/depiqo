import { Injectable } from '@nestjs/common';

import { BranchFacts } from '../../tenant-management/public-api/branch-facts.public-api';
import { CustomerLocationResolver } from '../application/ports/customer-location-resolver.port';
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
    private readonly customerLocationResolver: CustomerLocationResolver,
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

    const customerLocation = await this.customerLocationResolver.resolve(input.customerLocation);
    if (customerLocation.outcome === 'UNRESOLVED') {
      return { serviceable: false, reason: 'CUSTOMER_LOCATION_UNRESOLVED' };
    }
    if (customerLocation.outcome === 'AMBIGUOUS') {
      return { serviceable: false, reason: 'CUSTOMER_LOCATION_AMBIGUOUS' };
    }

    const route = await this.roadRouteDistanceProvider.getDrivingDistance({
      origin: {
        latitude: branch.operationalLocation.latitude,
        longitude: branch.operationalLocation.longitude,
      },
      destination: {
        latitude: customerLocation.location.latitude,
        longitude: customerLocation.location.longitude,
      },
    });
    if (route.outcome === 'NO_ROUTE') return { serviceable: false, reason: 'NO_ROUTE' };

    const calculation = this.calculator.calculate({
      configuration,
      distanceMeters: route.distanceMeters,
      effectiveTimezone: branch.effectiveTimezone,
      resolvedCustomerLocation: customerLocation.location,
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
}
