import { TenantPermission } from '@repo/api-contracts';

import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { RequireAnyPermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { GetRentableItemSummariesResult } from './get-rentable-item-summaries.handler';
import { GetRentableItemSummariesQuery } from './get-rentable-item-summaries.query';
import { GetRentableItemSummariesRequestDto } from './get-rentable-item-summaries.request.dto';
import type { GetRentableItemSummariesResponseDto } from './get-rentable-item-summaries.response.dto';

@Controller('catalog/rentable-item-summaries')
export class GetRentableItemSummariesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequireAnyPermission(
    TenantPermission.ProductsRead,
    TenantPermission.RentalsRead,
    TenantPermission.RentalsProposalsManage,
    TenantPermission.RentalsConfirm,
    TenantPermission.RentalsConfirmedManage,
    TenantPermission.RentalsFulfillmentManage,
    TenantPermission.RentalsCancel,
    TenantPermission.ContractsRead,
    TenantPermission.ContractsGenerate,
    TenantPermission.ContractsSigningSend,
  )
  async getRentableItemSummaries(
    @Query() dto: GetRentableItemSummariesRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentableItemSummariesResponseDto> {
    return this.queryBus.execute<GetRentableItemSummariesQuery, GetRentableItemSummariesResult>(
      new GetRentableItemSummariesQuery(user.tenantId, dto.ids),
    );
  }
}
