import { Injectable } from '@nestjs/common';

import { AddressGeocoder } from '../../shared/geocoding/address-geocoder.port';
import type { GeocodedLocation } from '../../shared/geocoding/geocoded-location';
import { BranchFacts } from '../../tenant-management/public-api/branch-facts.public-api';
import { RoadRouteDistanceProvider } from '../application/ports/road-route-distance-provider.port';
import { BranchDeliveryConfiguration } from '../domain/branch-delivery-configuration.aggregate';
import { DeliveryQuoteCalculator } from '../domain/delivery-quote-calculator';
import { InvalidDeliveryQuoteInputError } from '../domain/errors/delivery.errors';
import { BranchDeliveryConfigurationRepository } from '../persistence/branch-delivery-configuration.repository';
import {
  DeliveryEvaluationOutcome,
  DeliveryPolicyRestriction,
  DeliveryQuoteOutcome,
  DeliveryQuoteService,
  GetDeliveryQuoteInput,
  ResolvedCustomerLocation,
} from './delivery-quote.public-api';

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

    const evaluation = await this.evaluateTransportation(input, configuration);
    if (!evaluation.transportValid) {
      if (evaluation.reason === 'INVALID_PERIOD') {
        throw new InvalidDeliveryQuoteInputError('Rental period must be valid and end after its start.');
      }
      return { serviceable: false, reason: evaluation.reason };
    }
    if (evaluation.quote) return { serviceable: true, quote: evaluation.quote };
    return { serviceable: false, reason: evaluation.restrictions[0] };
  }

  async evaluate(input: GetDeliveryQuoteInput): Promise<DeliveryEvaluationOutcome> {
    const configuration = await this.configurations.findByTenantAndBranch(input.tenantId, input.branchId);
    return this.evaluateTransportation(input, configuration ?? undefined);
  }

  private async evaluateTransportation(
    input: GetDeliveryQuoteInput,
    configuration?: BranchDeliveryConfiguration,
  ): Promise<DeliveryEvaluationOutcome> {
    if (
      ![input.rentalStart, input.rentalEnd].every((date) => date instanceof Date && Number.isFinite(date.getTime())) ||
      input.rentalEnd <= input.rentalStart
    )
      return { transportValid: false, reason: 'INVALID_PERIOD' };

    const branchResult = await this.branchFacts.getBranchFacts({
      tenantId: input.tenantId,
      branchId: input.branchId,
    });
    if (branchResult.isErr()) {
      if (branchResult.error.code === 'BranchNotFound') {
        return { transportValid: false, reason: 'BRANCH_UNAVAILABLE' };
      }
      throw branchResult.error;
    }

    const branch = branchResult.value;
    if (!branch.isActive || branch.isDeleted) {
      return { transportValid: false, reason: 'BRANCH_UNAVAILABLE' };
    }
    if (!branch.operationalLocation) {
      return { transportValid: false, reason: 'BRANCH_LOCATION_MISSING' };
    }

    const customerLocation = await this.resolveCustomerLocation(input);
    if ('reason' in customerLocation) {
      return { transportValid: false, reason: customerLocation.reason };
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
    if (route.outcome === 'NO_ROUTE') return { transportValid: false, reason: 'NO_ROUTE' };
    if (!Number.isInteger(route.distanceMeters) || route.distanceMeters < 0) {
      throw new InvalidDeliveryQuoteInputError('Route distance must be a non-negative integer.');
    }

    const facts = {
      branchId: input.branchId,
      resolvedCustomerLocation: customerLocation,
      distanceMeters: route.distanceMeters,
      deliveryScheduledAt: input.rentalStart,
      collectionScheduledAt: input.rentalEnd,
      transportReservationMinutes: configuration?.transportReservationMinutes,
      currency: configuration?.currency.value,
    };
    if (!configuration) {
      return { transportValid: true, ...facts, restrictions: ['NOT_CONFIGURED'] };
    }

    const calculationInput = {
      configuration,
      distanceMeters: route.distanceMeters,
      effectiveTimezone: branch.effectiveTimezone,
      resolvedCustomerLocation: customerLocation,
      rentalStart: input.rentalStart,
      rentalEnd: input.rentalEnd,
      calculatedAt: new Date(),
    };
    const restrictions: DeliveryPolicyRestriction[] = configuration.enabled ? [] : ['DISABLED'];
    restrictions.push(...this.calculator.getPolicyRestrictions(calculationInput).map(({ code }) => code));
    if (restrictions.length) return { transportValid: true, ...facts, restrictions };

    const calculation = this.calculator.calculate(calculationInput);
    if (calculation.isErr()) throw calculation.error;
    return { transportValid: true, ...facts, restrictions, quote: calculation.value };
  }

  private async resolveCustomerLocation(
    input: GetDeliveryQuoteInput,
  ): Promise<ResolvedCustomerLocation | { reason: 'CUSTOMER_LOCATION_UNRESOLVED' }> {
    if ('resolvedLocation' in input.customerLocation) {
      const location = input.customerLocation.resolvedLocation;
      return this.isValidLocation(location) ? location : { reason: 'CUSTOMER_LOCATION_UNRESOLVED' };
    }

    const locationId = input.customerLocation.locationId.trim();
    if (!locationId) return { reason: 'CUSTOMER_LOCATION_UNRESOLVED' };

    const location = await this.addressGeocoder.resolve({ locationId });
    const resolved = location ? this.toResolvedCustomerLocation(location) : undefined;
    return resolved && this.isValidLocation(resolved) ? resolved : { reason: 'CUSTOMER_LOCATION_UNRESOLVED' };
  }

  private isValidLocation(location: ResolvedCustomerLocation): boolean {
    return (
      !!location.formattedAddress.trim() &&
      Number.isFinite(location.latitude) &&
      Math.abs(location.latitude) <= 90 &&
      Number.isFinite(location.longitude) &&
      Math.abs(location.longitude) <= 180
    );
  }

  private toResolvedCustomerLocation(location: GeocodedLocation): ResolvedCustomerLocation {
    return {
      formattedAddress: location.formattedAddress,
      latitude: location.latitude,
      longitude: location.longitude,
      addressLine1: location.street,
      city: location.city,
      state: location.stateRegion,
      postalCode: location.postalCode,
      country: location.country,
      providerPlaceId: location.providerPlaceId,
    };
  }
}
