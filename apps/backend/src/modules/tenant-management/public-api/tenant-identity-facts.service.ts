import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { TenantIdentityFact, TenantIdentityFacts, TenantIdentityFactsError } from './tenant-identity-facts.public-api';

@Injectable()
export class TenantIdentityFactsService extends TenantIdentityFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getTenantIdentityFacts(input: {
    tenantId: string;
  }): Promise<Result<TenantIdentityFact, TenantIdentityFactsError>> {
    const tenant = await this.prisma.client.v2Tenant.findUnique({
      where: { id: input.tenantId },
      select: { id: true, name: true, slug: true, status: true, deletedAt: true },
    });

    if (!tenant) return err({ code: 'TenantNotFound', message: `Tenant "${input.tenantId}" was not found.` });
    if (tenant.deletedAt) return err({ code: 'TenantDeleted', message: `Tenant "${input.tenantId}" is deleted.` });
    if (tenant.status !== 'ACTIVE')
      return err({ code: 'TenantInactive', message: `Tenant "${input.tenantId}" is inactive.` });

    return ok({ tenantId: tenant.id, name: tenant.name, slug: tenant.slug });
  }
}
