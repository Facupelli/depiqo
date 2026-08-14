import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { Public } from 'src/core/decorators/public.decorator';

import { SkipCsrf } from '../../auth/shared/csrf/skip-csrf.decorator';
import { CurrentStorefrontTenant } from '../../tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from '../../tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from '../../tenant-context/tenant-context.contract';
import { GetStorefrontBranchScheduleSlotsResult } from './get-storefront-branch-schedule-slots.handler';
import { GetStorefrontBranchScheduleSlotsQuery } from './get-storefront-branch-schedule-slots.query';
import {
  GetStorefrontBranchScheduleSlotsParamsDto,
  GetStorefrontBranchScheduleSlotsRequestDto,
} from './get-storefront-branch-schedule-slots.request.dto';
import type { GetStorefrontBranchScheduleSlotsResponseDto } from './get-storefront-branch-schedule-slots.response.dto';

@Public()
@SkipCsrf()
@Controller('storefront/tenant-management/branches')
@UseGuards(StorefrontTenantContextGuard)
export class GetStorefrontBranchScheduleSlotsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':branchId/schedule-slots')
  async getScheduleSlots(
    @Param() params: GetStorefrontBranchScheduleSlotsParamsDto,
    @Query() dto: GetStorefrontBranchScheduleSlotsRequestDto,
    @CurrentStorefrontTenant() tenant: StorefrontTenantContext,
  ): Promise<GetStorefrontBranchScheduleSlotsResponseDto> {
    return this.queryBus.execute<GetStorefrontBranchScheduleSlotsQuery, GetStorefrontBranchScheduleSlotsResult>(
      new GetStorefrontBranchScheduleSlotsQuery(tenant.tenantId, params.branchId, dto.periodStart, dto.periodEnd),
    );
  }
}
