import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from 'src/config/env.schema';
import { DeliveryProviderError, DeliveryProviderOperation } from '../../application/errors/delivery-provider.error';

const MAPBOX_REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class MapboxHttpClient {
  private static readonly provider = 'Mapbox';
  private readonly accessToken: string;

  constructor(configService: ConfigService<Env, true>) {
    this.accessToken = configService.get('MAPBOX_ACCESS_TOKEN');
  }

  async getJson(url: URL, operation: DeliveryProviderOperation): Promise<unknown> {
    url.searchParams.set('access_token', this.accessToken);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(MAPBOX_REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw this.error(operation, 'Mapbox request failed.', error);
    }

    if (!response.ok) {
      throw this.error(operation, `Mapbox request failed with HTTP status ${response.status}.`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw this.error(operation, 'Mapbox returned malformed JSON.', error);
    }
  }

  malformedResponse(operation: DeliveryProviderOperation, detail: string): DeliveryProviderError {
    return this.error(operation, `Mapbox returned a malformed response: ${detail}`);
  }

  private error(operation: DeliveryProviderOperation, message: string, cause?: unknown): DeliveryProviderError {
    return new DeliveryProviderError(MapboxHttpClient.provider, operation, message, cause);
  }
}
