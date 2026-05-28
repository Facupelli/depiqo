import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { Public } from 'src/core/decorators/public.decorator';

import { SkipCsrf } from '../../auth/shared/csrf/skip-csrf.decorator';
import { CurrentStorefrontTenant } from '../../tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from '../../tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from '../../tenant-context/tenant-context.contract';
import { GetPublicTenantConfigResult } from './get-public-tenant-config.handler';
import { toGetPublicTenantConfigProblem } from './get-public-tenant-config-http-error.mapper';
import { GetPublicTenantConfigQuery } from './get-public-tenant-config.query';
import { GetPublicTenantConfigResponseDto } from './get-public-tenant-config.response.dto';

@Public()
@SkipCsrf()
@Controller('storefront/tenant-management/tenant')
@UseGuards(StorefrontTenantContextGuard)
export class GetPublicTenantConfigHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('config')
  async getConfig(
    @CurrentStorefrontTenant() tenant: StorefrontTenantContext,
  ): Promise<GetPublicTenantConfigResponseDto> {
    const result = await this.queryBus.execute<GetPublicTenantConfigQuery, GetPublicTenantConfigResult>(
      new GetPublicTenantConfigQuery(tenant.tenantId),
    );

    if (result.isErr()) {
      throw toGetPublicTenantConfigProblem(result.error);
    }

    return result.value;
  }
}
