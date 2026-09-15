import { TenantPermission } from '@repo/api-contracts';

import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { RequireAnyPermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { GetRentableItemsResult } from './get-rentable-items.handler';
import { GetRentableItemsQuery } from './get-rentable-items.query';
import { GetRentableItemsRequestDto } from './get-rentable-items.request.dto';
import type { GetRentableItemsResponseDto } from './get-rentable-items.response.dto';

@Controller('catalog/rentable-items')
export class GetRentableItemsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequireAnyPermission(
    TenantPermission.ProductsRead,
    TenantPermission.ProductsManage,
    TenantPermission.ProductsAvailabilityManage,
    TenantPermission.PricingManage,
  )
  async getRentableItems(
    @Query() dto: GetRentableItemsRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentableItemsResponseDto> {
    return this.queryBus.execute<GetRentableItemsQuery, GetRentableItemsResult>(
      new GetRentableItemsQuery(user.tenantId, {
        search: dto.search,
        kinds: dto.kinds,
        status: dto.status,
        categoryId: dto.categoryId,
        branchId: dto.branchId,
        isVisible: dto.isVisible,
        isRentable: dto.isRentable,
        hasActivePricing: dto.hasActivePricing,
        page: dto.page,
        pageSize: dto.pageSize,
      }),
    );
  }
}
