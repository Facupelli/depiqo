import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from 'src/config/env.schema';
import { DeliveryProviderError } from '../../application/errors/delivery-provider.error';

const MAPBOX_REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class MapboxDirectionsHttpClient {
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
      throw this.error('Mapbox request failed.', error);
    }

    if (!response.ok) {
      throw this.error(`Mapbox request failed with HTTP status ${response.status}.`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw this.error('Mapbox returned malformed JSON.', error);
    }
  }

  malformedResponse(detail: string): DeliveryProviderError {
    return this.error(`Mapbox returned a malformed response: ${detail}`);
  }

  private error(message: string, cause?: unknown): DeliveryProviderError {
    return new DeliveryProviderError(MapboxDirectionsHttpClient.provider, 'getDrivingDistance', message, cause);
  }
}
