import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { TenantBrandingFact, TenantBrandingFacts, TenantBrandingFactsError } from './tenant-branding-facts.public-api';

@Injectable()
export class TenantBrandingFactsService extends TenantBrandingFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getTenantBrandingFacts(input: {
    tenantId: string;
  }): Promise<Result<TenantBrandingFact, TenantBrandingFactsError>> {
    const tenant = await this.prisma.client.v2Tenant.findUnique({
      where: { id: input.tenantId },
      select: {
        status: true,
        deletedAt: true,
        branding: { select: { logoUrl: true } },
      },
    });

    if (!tenant) return err({ code: 'TenantNotFound', message: `Tenant "${input.tenantId}" was not found.` });
    if (tenant.deletedAt) return err({ code: 'TenantDeleted', message: `Tenant "${input.tenantId}" is deleted.` });
    if (tenant.status !== 'ACTIVE')
      return err({ code: 'TenantInactive', message: `Tenant "${input.tenantId}" is inactive.` });

    return ok({ logoUrl: tenant.branding?.logoUrl ?? null });
  }
}
