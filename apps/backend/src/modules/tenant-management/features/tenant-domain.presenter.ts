import { TenantDomainDto } from '@repo/api-contracts';
import { V2TenantDomainStatus } from 'src/generated/prisma/client';

export interface TenantDomainReadModel {
  id: string;
  tenantId: string;
  domain: string;
  status: V2TenantDomainStatus;
  isPrimary: boolean;
  cfHostnameId: string | null;
  verifiedAt: Date | null;
  lastCheckedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toTenantDomainDto(domain: TenantDomainReadModel): TenantDomainDto {
  return {
    id: domain.id,
    tenantId: domain.tenantId,
    domain: domain.domain,
    status: domain.status,
    isPrimary: domain.isPrimary,
    cfHostnameId: domain.cfHostnameId,
    verifiedAt: domain.verifiedAt?.toISOString() ?? null,
    lastCheckedAt: domain.lastCheckedAt?.toISOString() ?? null,
    failureReason: domain.failureReason,
    createdAt: domain.createdAt.toISOString(),
    updatedAt: domain.updatedAt.toISOString(),
  };
}
