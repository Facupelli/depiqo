import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from 'src/config/env.schema';
import { DeliveryProviderError } from '../../application/errors/delivery-provider.error';

const GEOAPIFY_REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class GeoapifyRoutingHttpClient {
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
      throw this.error('Geoapify routing request failed.', error);
    }

    if (!response.ok) {
      throw this.error(
        `Geoapify routing request failed with HTTP status ${response.status}.`,
      );
    }

    try {
      return await response.json();
    } catch (error) {
      throw this.error('Geoapify returned malformed routing JSON.', error);
    }
  }

  malformedResponse(detail: string): DeliveryProviderError {
    return this.error(
      `Geoapify returned a malformed routing response: ${detail}`,
    );
  }

  private error(
    message: string,
    cause?: unknown,
  ): DeliveryProviderError {
    return new DeliveryProviderError(
      GeoapifyRoutingHttpClient.provider,
      'getDrivingDistance',
      message,
      cause,
    );
  }
}
