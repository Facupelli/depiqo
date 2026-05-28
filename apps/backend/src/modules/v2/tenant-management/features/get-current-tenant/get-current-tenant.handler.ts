import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TenantBrandingDto, TenantConfigDto } from '@repo/api-contracts';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { TenantConfig, TenantConfigProps } from '../../domain/value-objects/tenant-config.value-object';
import {
  getCurrentTenantApplicationError,
  GetCurrentTenantApplicationError,
} from './get-current-tenant-application.error';
import { GetCurrentTenantQuery } from './get-current-tenant.query';

export interface GetCurrentTenantReadModel {
  id: string;
  name: string;
  slug: string;
  config: TenantConfigDto;
  branding: TenantBrandingDto;
  createdAt: string;
  updatedAt: string;
}

export type GetCurrentTenantResult = Result<GetCurrentTenantReadModel, GetCurrentTenantApplicationError>;

@QueryHandler(GetCurrentTenantQuery)
export class GetCurrentTenantHandler implements IQueryHandler<GetCurrentTenantQuery, GetCurrentTenantResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCurrentTenantQuery): Promise<GetCurrentTenantResult> {
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: {
        id: query.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        config: true,
        branding: {
          select: {
            logoUrl: true,
            faviconUrl: true,
            primaryColor: true,
            accentColor: true,
            storefrontName: true,
            tagline: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      return err(getCurrentTenantApplicationError('TenantNotFound', `Tenant "${query.tenantId}" was not found.`));
    }

    let config: TenantConfigDto;
    try {
      config = TenantConfig.reconstitute(tenant.config as unknown as TenantConfigProps).toPlainObject();
    } catch (error) {
      return err(getCurrentTenantApplicationError('Unexpected', 'The tenant config could not be normalized.', error));
    }

    return ok({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      config,
      branding: {
        logoUrl: tenant.branding?.logoUrl ?? null,
        faviconUrl: tenant.branding?.faviconUrl ?? null,
        primaryColor: tenant.branding?.primaryColor ?? null,
        accentColor: tenant.branding?.accentColor ?? null,
        storefrontName: tenant.branding?.storefrontName ?? null,
        tagline: tenant.branding?.tagline ?? null,
      },
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    });
  }
}
