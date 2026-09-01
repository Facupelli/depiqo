import { Injectable } from '@nestjs/common';

import {
  CustomerLocationResolution,
  CustomerLocationResolver,
  CustomerLocationSelection,
} from '../../application/ports/customer-location-resolver.port';
import { ResolvedCustomerLocation } from '../../domain/delivery-quote.types';
import { MapboxHttpClient } from './mapbox-http.client';

interface MapboxContextValue {
  name?: unknown;
}

interface MapboxGeocodingFeature {
  id?: unknown;
  geometry?: { coordinates?: unknown };
  properties?: {
    mapbox_id?: unknown;
    full_address?: unknown;
    name?: unknown;
    place_formatted?: unknown;
    match_code?: { confidence?: unknown };
    context?: {
      place?: MapboxContextValue;
      locality?: MapboxContextValue;
      region?: MapboxContextValue;
      postcode?: MapboxContextValue;
      country?: MapboxContextValue;
    };
  };
}

interface Candidate {
  location: ResolvedCustomerLocation;
  confidence?: string;
}

@Injectable()
export class MapboxCustomerLocationResolverAdapter extends CustomerLocationResolver {
  constructor(private readonly httpClient: MapboxHttpClient) {
    super();
  }

  async resolve(selection: CustomerLocationSelection): Promise<CustomerLocationResolution> {
    const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
    url.searchParams.set('address_line1', selection.addressLine1);
    url.searchParams.set('place', selection.city);
    this.setOptionalParameter(url, 'region', selection.state);
    this.setOptionalParameter(url, 'postcode', selection.postalCode);
    this.setOptionalParameter(url, 'country', selection.country);
    url.searchParams.set('types', 'address');
    url.searchParams.set('autocomplete', 'false');
    url.searchParams.set('permanent', 'true');
    url.searchParams.set('limit', '2');

    const body = await this.httpClient.getJson(url, 'resolveCustomerLocation');
    const features = this.readFeatures(body);
    const candidates = features.map((feature) => this.toCandidate(feature, selection));

    if (candidates.length === 0) {
      return { outcome: 'UNRESOLVED' };
    }

    if (candidates.length === 1 || this.hasDecisiveFirstCandidate(candidates)) {
      return { outcome: 'RESOLVED', location: candidates[0].location };
    }

    return { outcome: 'AMBIGUOUS' };
  }

  private readFeatures(body: unknown): MapboxGeocodingFeature[] {
    if (!this.isRecord(body) || !Array.isArray(body.features)) {
      throw this.httpClient.malformedResponse('resolveCustomerLocation', 'features must be an array.');
    }

    return body.features as MapboxGeocodingFeature[];
  }

  private toCandidate(feature: MapboxGeocodingFeature, selection: CustomerLocationSelection): Candidate {
    if (!this.isRecord(feature) || !this.isRecord(feature.properties) || !this.isRecord(feature.geometry)) {
      throw this.httpClient.malformedResponse('resolveCustomerLocation', 'an address feature is malformed.');
    }

    const coordinates = feature.geometry.coordinates;
    if (
      !Array.isArray(coordinates) ||
      coordinates.length < 2 ||
      !this.isValidLongitude(coordinates[0]) ||
      !this.isValidLatitude(coordinates[1])
    ) {
      throw this.httpClient.malformedResponse('resolveCustomerLocation', 'an address feature has invalid coordinates.');
    }

    const properties = feature.properties;
    const addressLine1 = this.optionalString(properties.name);
    const placeFormatted = this.optionalString(properties.place_formatted);
    const formattedAddress =
      this.optionalString(properties.full_address) ??
      [addressLine1, placeFormatted].filter((value): value is string => value !== undefined).join(', ');
    const providerPlaceId = this.optionalString(properties.mapbox_id) ?? this.optionalString(feature.id);

    if (!formattedAddress || !providerPlaceId) {
      throw this.httpClient.malformedResponse(
        'resolveCustomerLocation',
        'an address feature is missing its formatted address or identifier.',
      );
    }

    const context = this.isRecord(properties.context) ? properties.context : undefined;

    return {
      location: {
        formattedAddress,
        longitude: coordinates[0],
        latitude: coordinates[1],
        addressLine1,
        addressLine2: selection.addressLine2,
        city: this.contextName(context?.place) ?? this.contextName(context?.locality),
        state: this.contextName(context?.region),
        postalCode: this.contextName(context?.postcode),
        country: this.contextName(context?.country),
        providerPlaceId,
      },
      confidence: this.isRecord(properties.match_code)
        ? this.optionalString(properties.match_code.confidence)
        : undefined,
    };
  }

  private hasDecisiveFirstCandidate(candidates: Candidate[]): boolean {
    const decisive = new Set(['exact', 'high']);
    return (
      decisive.has(candidates[0].confidence ?? '') &&
      candidates.slice(1).every((candidate) => !decisive.has(candidate.confidence ?? ''))
    );
  }

  private contextName(value: unknown): string | undefined {
    return this.isRecord(value) ? this.optionalString(value.name) : undefined;
  }

  private setOptionalParameter(url: URL, name: string, value?: string): void {
    if (value) url.searchParams.set(name, value);
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
  }

  private isValidLongitude(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
  }

  private isValidLatitude(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
