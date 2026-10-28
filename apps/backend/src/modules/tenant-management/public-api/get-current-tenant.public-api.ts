import type { TenantBrandingDto, TenantConfigDto } from '@repo/api-contracts';
import type { Result } from 'neverthrow';

import type { ApplicationError } from 'src/core/errors/application-error';

/** Published synchronous query, dispatched through QueryBus using the caller's trusted tenant context. */
export class GetCurrentTenantQuery {
  constructor(public readonly tenantId: string) {}
}

export interface GetCurrentTenantReadModel {
  id: string;
  name: string;
  slug: string;
  config: TenantConfigDto;
  branding: TenantBrandingDto;
  createdAt: string;
  updatedAt: string;
}

export type GetCurrentTenantErrorCode = 'tenant_management.tenant_not_found';

export interface GetCurrentTenantError extends ApplicationError {
  code: GetCurrentTenantErrorCode;
}

export type GetCurrentTenantResult = Result<GetCurrentTenantReadModel, GetCurrentTenantError>;
