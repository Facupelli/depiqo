import { Injectable } from '@nestjs/common';

import {
  AddressGeocoder,
  GeocodeAddressInput,
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

    // Avoid Geoapify biasing results by the backend server's IP country.
    url.searchParams.set('bias', 'countrycode:none');

    const body = await this.httpClient.getJson(url);
    const candidates = this.readResults(body).map((result) =>
      this.toCandidate(result),
    );

		console.dir({body},{depth:null})

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

  private readResults(body: unknown): GeoapifyGeocodingResult[] {
    if (!this.isRecord(body) || !Array.isArray(body.results)) {
      throw this.httpClient.malformedResponse(
        'results must be an array.',
      );
    }

    return body.results as GeoapifyGeocodingResult[];
  }

  private toCandidate(
    result: GeoapifyGeocodingResult,
  ): Candidate {
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
    const providerPlaceId = this.optionalString(result.place_id);

    if (!formattedAddress || !providerPlaceId) {
      throw this.httpClient.malformedResponse(
        'a geocoding result is missing its formatted address or identifier.',
      );
    }

    return {
      location: {
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
      },
      confidence: this.readConfidence(result.rank),
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
