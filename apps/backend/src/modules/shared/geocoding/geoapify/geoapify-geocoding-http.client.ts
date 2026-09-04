import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from 'src/config/env.schema';

import { GeocodingProviderError } from '../geocoding-provider.error';

const GEOAPIFY_REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class GeoapifyGeocodingHttpClient {
  private static readonly provider = 'Geoapify';
  private readonly apiKey: string;

  constructor(configService: ConfigService<Env, true>) {
    this.apiKey = configService.get('GEOAPIFY_API_KEY');
  }

  async getJson(url: URL): Promise<unknown> {
    url.searchParams.set('apiKey', this.apiKey);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(GEOAPIFY_REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw this.error('Geoapify geocoding request failed.', error);
    }

    if (!response.ok) {
      throw this.error(`Geoapify geocoding request failed with HTTP status ${response.status}.`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw this.error('Geoapify returned malformed geocoding JSON.', error);
    }
  }

  malformedResponse(detail: string): GeocodingProviderError {
    return this.error(`Geoapify returned a malformed geocoding response: ${detail}`);
  }

  private error(message: string, cause?: unknown): GeocodingProviderError {
    return new GeocodingProviderError(GeoapifyGeocodingHttpClient.provider, message, cause);
  }
}
