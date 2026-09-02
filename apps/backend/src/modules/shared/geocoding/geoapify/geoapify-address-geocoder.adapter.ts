import { Injectable } from '@nestjs/common';

import {
  AddressGeocoder,
  AddressSuggestion,
  GeocodeAddressInput,
  ResolveAddressInput,
  SearchAddressesInput,
} from '../address-geocoder.port';
import {
  AddressGeocodingResult,
  GeocodedLocation,
} from '../geocoded-location';
import { GeoapifyGeocodingHttpClient } from './geoapify-geocoding-http.client';

const ACCEPT_CONFIDENCE = 0.95;
const DECLINE_CONFIDENCE = 0.2;

interface GeoapifyRank {
  confidence?: unknown;
  match_type?: unknown;
}

interface GeoapifyGeocodingResult {
  address_line1?: unknown;
  address_line2?: unknown;
  housenumber?: unknown;
  street?: unknown;
  city?: unknown;
  state?: unknown;
  postcode?: unknown;
  country?: unknown;
  lon?: unknown;
  lat?: unknown;
  formatted?: unknown;
  result_type?: unknown;
  place_id?: unknown;
  rank?: GeoapifyRank;
}

interface GeoapifyPlaceDetailsFeature {
  properties?: unknown;
}

interface Candidate {
  location: GeocodedLocation;
  confidence?: number;
}

@Injectable()
export class GeoapifyAddressGeocoderAdapter extends AddressGeocoder {
  constructor(
    private readonly httpClient: GeoapifyGeocodingHttpClient,
  ) {
    super();
  }

  async geocode(
    input: GeocodeAddressInput,
  ): Promise<AddressGeocodingResult> {
    const url = new URL(
      'https://api.geoapify.com/v1/geocode/search',
    );

    url.searchParams.set('text', input.address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '2');
    url.searchParams.set('lang', 'es');

    // Avoid Geoapify biasing results by the backend server's IP country.
    url.searchParams.set('bias', 'countrycode:none');

    const body = await this.httpClient.getJson(url);
    const candidates = this.readResults(body).map((result) =>
      this.toCandidate(result),
    );

    if (candidates.length === 0) {
      return { outcome: 'UNRESOLVED' };
    }

    const first = candidates[0];
    const firstConfidence = first.confidence ?? 0;

    if (firstConfidence < DECLINE_CONFIDENCE) {
      return { outcome: 'UNRESOLVED' };
    }

    const second = candidates[1];

    if (
      firstConfidence >= ACCEPT_CONFIDENCE &&
      (!second || (second.confidence ?? 0) < ACCEPT_CONFIDENCE)
    ) {
      return {
        outcome: 'RESOLVED',
        location: first.location,
      };
    }

    return { outcome: 'AMBIGUOUS' };
  }

  async search(
    input: SearchAddressesInput,
  ): Promise<readonly AddressSuggestion[]> {
    const url = new URL(
      'https://api.geoapify.com/v1/geocode/autocomplete',
    );

    url.searchParams.set('text', input.text);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '5');
    url.searchParams.set('lang', 'es');
    url.searchParams.set('bias', 'countrycode:none');

    const body = await this.httpClient.getJson(url);

    return this.readResults(body).map((result) =>
      this.toSuggestion(result),
    );
  }

  async resolve(
    input: ResolveAddressInput,
  ): Promise<GeocodedLocation | null> {
    const url = new URL(
      'https://api.geoapify.com/v2/place-details',
    );

    url.searchParams.set('id', input.locationId);
    url.searchParams.set('lang', 'es');

    const body = await this.httpClient.getJson(url);
    const feature = this.readDetailsFeature(body);

    if (!feature) return null;

    if (!this.isRecord(feature.properties)) {
      throw this.httpClient.malformedResponse(
        'a place details feature has malformed properties.',
      );
    }

    return this.toLocation(feature.properties, input.locationId);
  }

  private readResults(body: unknown): GeoapifyGeocodingResult[] {
    if (!this.isRecord(body) || !Array.isArray(body.results)) {
      throw this.httpClient.malformedResponse(
        'results must be an array.',
      );
    }

    return body.results as GeoapifyGeocodingResult[];
  }

  private readDetailsFeature(
    body: unknown,
  ): GeoapifyPlaceDetailsFeature | null {
    if (!this.isRecord(body) || !Array.isArray(body.features)) {
      throw this.httpClient.malformedResponse(
        'features must be an array.',
      );
    }

    if (body.features.length === 0) return null;

    const feature: unknown = body.features[0];

    if (!this.isRecord(feature)) {
      throw this.httpClient.malformedResponse(
        'a place details feature is malformed.',
      );
    }

    return feature;
  }

  private toSuggestion(
    result: GeoapifyGeocodingResult,
  ): AddressSuggestion {
    if (!this.isRecord(result)) {
      throw this.httpClient.malformedResponse(
        'an address suggestion is malformed.',
      );
    }

    const locationId = this.optionalString(result.place_id);
    const formattedAddress = this.optionalString(result.formatted);

    if (!locationId || !formattedAddress) {
      throw this.httpClient.malformedResponse(
        'an address suggestion is missing its formatted address or identifier.',
      );
    }

    return {
      locationId,
      formattedAddress,
      addressLine1: this.optionalString(result.address_line1),
      addressLine2: this.optionalString(result.address_line2),
    };
  }

  private toCandidate(
    result: GeoapifyGeocodingResult,
  ): Candidate {
    return {
      location: this.toLocation(result),
      confidence: this.readConfidence(result.rank),
    };
  }

  private toLocation(
    result: GeoapifyGeocodingResult,
    providerPlaceIdOverride?: string,
  ): GeocodedLocation {
    if (!this.isRecord(result)) {
      throw this.httpClient.malformedResponse(
        'a geocoding result is malformed.',
      );
    }

    const latitude = result.lat;
    const longitude = result.lon;

    if (
      !this.isValidLatitude(latitude) ||
      !this.isValidLongitude(longitude)
    ) {
      throw this.httpClient.malformedResponse(
        'a geocoding result has invalid coordinates.',
      );
    }

    const formattedAddress = this.optionalString(result.formatted);
    const providerPlaceId =
      providerPlaceIdOverride ??
      this.optionalString(result.place_id);

    if (!formattedAddress || !providerPlaceId) {
      throw this.httpClient.malformedResponse(
        'a geocoding result is missing its formatted address or identifier.',
      );
    }

    return {
      formattedAddress,
      latitude,
      longitude,
      street: this.optionalString(result.street),
      streetNumber: this.optionalString(result.housenumber),
      city: this.optionalString(result.city),
      stateRegion: this.optionalString(result.state),
      postalCode: this.optionalString(result.postcode),
      country: this.optionalString(result.country),
      providerPlaceId,
    };
  }

  private readConfidence(rank: unknown): number | undefined {
    if (!this.isRecord(rank)) return undefined;

    const confidence = rank.confidence;

    return typeof confidence === 'number' &&
      Number.isFinite(confidence) &&
      confidence >= 0 &&
      confidence <= 1
      ? confidence
      : undefined;
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : undefined;
  }

  private isValidLongitude(value: unknown): value is number {
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= -180 &&
      value <= 180
    );
  }

  private isValidLatitude(value: unknown): value is number {
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= -90 &&
      value <= 90
    );
  }

  private isRecord(
    value: unknown,
  ): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
