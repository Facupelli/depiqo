import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { Public } from 'src/core/decorators/public.decorator';

import { SkipCsrf } from '../../auth/shared/csrf/skip-csrf.decorator';
import { CurrentStorefrontTenant } from '../../tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from '../../tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from '../../tenant-context/tenant-context.contract';
import { GetStorefrontBranchSchedulesResult } from './get-storefront-branch-schedules.handler';
import { GetStorefrontBranchSchedulesQuery } from './get-storefront-branch-schedules.query';
import { GetStorefrontBranchSchedulesParamsDto } from './get-storefront-branch-schedules.request.dto';
import type { GetStorefrontBranchSchedulesResponseDto } from './get-storefront-branch-schedules.response.dto';

@Public()
@SkipCsrf()
@Controller('storefront/tenant-management/branches')
@UseGuards(StorefrontTenantContextGuard)
export class GetStorefrontBranchSchedulesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':branchId/schedules')
  async getSchedules(
    @Param() params: GetStorefrontBranchSchedulesParamsDto,
    @CurrentStorefrontTenant() tenant: StorefrontTenantContext,
  ): Promise<GetStorefrontBranchSchedulesResponseDto> {
    return this.queryBus.execute<GetStorefrontBranchSchedulesQuery, GetStorefrontBranchSchedulesResult>(
      new GetStorefrontBranchSchedulesQuery(tenant.tenantId, params.branchId),
    );
  }
}
