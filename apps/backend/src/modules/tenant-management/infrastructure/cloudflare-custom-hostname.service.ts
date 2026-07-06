import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from 'src/config/env.schema';

export interface CloudflareCustomHostname {
  id: string;
  hostname: string;
  status: string | null;
  sslStatus: string | null;
  validationErrors: string[];
  ownershipVerificationErrors: string[];
}

interface CloudflareApiResponse {
  success?: boolean;
  errors?: Array<{ message?: string }>;
  result?: Record<string, unknown>;
}

@Injectable()
export class CloudflareCustomHostnameService {
  private readonly apiToken: string;
  private readonly zoneId: string;
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.apiToken = this.configService.get('CLOUDFLARE_API_TOKEN');
    this.zoneId = this.configService.get('CLOUDFLARE_ZONE_ID');
  }

  async createCustomHostname(hostname: string): Promise<CloudflareCustomHostname> {
    return this.request(`/zones/${this.zoneId}/custom_hostnames`, {
      method: 'POST',
      body: JSON.stringify({
        hostname,
        ssl: {
          method: 'txt',
          type: 'dv',
        },
      }),
    });
  }

  async getCustomHostname(cfHostnameId: string): Promise<CloudflareCustomHostname> {
    return this.request(`/zones/${this.zoneId}/custom_hostnames/${cfHostnameId}`, {
      method: 'GET',
    });
  }

  private async request(path: string, init: RequestInit): Promise<CloudflareCustomHostname> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const payload = (await response.json()) as CloudflareApiResponse;

    if (!response.ok || !payload.success || !payload.result) {
      const providerMessage = payload.errors
        ?.map((error) => error.message)
        .filter(Boolean)
        .join('; ');
      throw new Error(providerMessage || `Cloudflare request failed with status ${response.status}`);
    }

    return this.toCustomHostname(payload.result);
  }

  private toCustomHostname(result: Record<string, unknown>): CloudflareCustomHostname {
    const ssl = this.asRecord(result.ssl);
    const ownershipVerification = this.asRecord(result.ownership_verification);

    const id = typeof result.id === 'string' ? result.id : null;
    const hostname = typeof result.hostname === 'string' ? result.hostname : null;

    if (!id || !hostname) {
      throw new Error('Cloudflare custom hostname response is missing required fields');
    }

    return {
      id,
      hostname,
      status: typeof result.status === 'string' ? result.status : null,
      sslStatus: typeof ssl?.status === 'string' ? ssl.status : null,
      validationErrors: this.toMessageList(ssl?.validation_errors),
      ownershipVerificationErrors: this.toMessageList(ownershipVerification?.errors),
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }

  private toMessageList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry;
        }

        if (entry && typeof entry === 'object' && 'message' in entry && typeof entry.message === 'string') {
          return entry.message;
        }

        return null;
      })
      .filter((entry): entry is string => entry !== null);
  }
}
