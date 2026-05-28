import { createHash, randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from 'src/config/env.schema';

@Injectable()
export class SigningReceiptTokenService {
  private readonly receiptTokenTtlSeconds: number;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.receiptTokenTtlSeconds =
      this.configService.get('DOCUMENT_SIGNING_RECEIPT_TOKEN_TTL_SECONDS', {
        infer: true,
      }) ?? 60 * 60 * 24 * 30;
  }

  generateRawToken(): string {
    return randomBytes(32).toString('hex');
  }

  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  buildExpiresAt(now: Date): Date {
    return new Date(now.getTime() + this.receiptTokenTtlSeconds * 1000);
  }
}
