import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '@repo/schemas';

import { Env } from 'src/config/env.schema';

@Injectable()
export class SigningReceiptUrlService {
  private readonly rootDomain: string;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.rootDomain = this.configService.get('ROOT_DOMAIN');
  }

  buildSignedPdfDownloadUrl(input: { tenant: TenantContext; rawReceiptToken: string }): string {
    const hostname = input.tenant.customDomain ?? `${input.tenant.slug}.${this.rootDomain}`;
    const token = encodeURIComponent(input.rawReceiptToken);

    return `https://${hostname}/api/v2/document-signing/public/receipts/signed-pdf?token=${token}`;
  }
}
