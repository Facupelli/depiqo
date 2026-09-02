import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from 'src/config/env.schema';

import { GeocodingProviderError } from '../geocoding-provider.error';

const MAPBOX_REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class MapboxGeocodingHttpClient {
  private static readonly provider = 'Mapbox';
  private readonly accessToken: string;

  constructor(configService: ConfigService<Env, true>) {
    this.accessToken = configService.get('MAPBOX_ACCESS_TOKEN');
  }

  async getJson(url: URL): Promise<unknown> {
    url.searchParams.set('access_token', this.accessToken);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(MAPBOX_REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw this.error('Mapbox geocoding request failed.', error);
    }

    if (!response.ok) {
      throw this.error(`Mapbox geocoding request failed with HTTP status ${response.status}.`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw this.error('Mapbox returned malformed geocoding JSON.', error);
    }
  }

  malformedResponse(detail: string): GeocodingProviderError {
    return this.error(`Mapbox returned a malformed geocoding response: ${detail}`);
  }

  private error(message: string, cause?: unknown): GeocodingProviderError {
    return new GeocodingProviderError(MapboxGeocodingHttpClient.provider, message, cause);
  }
}
