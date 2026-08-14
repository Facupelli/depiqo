import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { TenantDomainDto } from '@repo/api-contracts';
import { toTenantDomainDto } from '../tenant-domain.presenter';
import { GetCustomDomainQuery } from './get-custom-domain.query';

export type GetCustomDomainResult = TenantDomainDto | null;

@QueryHandler(GetCustomDomainQuery)
export class GetCustomDomainHandler implements IQueryHandler<GetCustomDomainQuery, GetCustomDomainResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCustomDomainQuery): Promise<GetCustomDomainResult> {
    const domain = await this.prisma.client.v2TenantDomain.findFirst({
      where: {
        tenantId: query.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        domain: true,
        status: true,
        isPrimary: true,
        cfHostnameId: true,
        verifiedAt: true,
        lastCheckedAt: true,
        failureReason: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return domain ? toTenantDomainDto(domain) : null;
  }
}
