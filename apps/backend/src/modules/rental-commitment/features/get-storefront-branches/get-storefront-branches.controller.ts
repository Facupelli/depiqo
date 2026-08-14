import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { Public } from 'src/core/decorators/public.decorator';
import { SkipCsrf } from 'src/modules/tenant-management/auth/shared/csrf/skip-csrf.decorator';
import { CurrentStorefrontTenant } from '../../../tenant-management/tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from '../../../tenant-management/tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from '../../../tenant-management/tenant-context/tenant-context.contract';
import { GetStorefrontBranchesResult } from './get-storefront-branches.handler';
import { GetStorefrontBranchesQuery } from './get-storefront-branches.query';
import type { GetStorefrontBranchesResponseDto } from './get-storefront-branches.response.dto';

@Public()
@SkipCsrf()
@Controller('storefront/rental-commitment/branches')
@UseGuards(StorefrontTenantContextGuard)
export class GetStorefrontBranchesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getBranches(
    @CurrentStorefrontTenant() tenant: StorefrontTenantContext,
  ): Promise<GetStorefrontBranchesResponseDto> {
    return this.queryBus.execute<GetStorefrontBranchesQuery, GetStorefrontBranchesResult>(
      new GetStorefrontBranchesQuery(tenant.tenantId),
    );
  }
}
