import { TenantPermission } from '@repo/api-contracts';
import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { RequireAnyPermission } from '../../authorization/tenant-authorization.decorators';
import { GetCategoriesResult } from './get-categories.handler';
import { GetCategoriesQuery } from './get-categories.query';
import type { GetCategoriesResponseDto } from './get-categories.response.dto';

@Controller('tenant-management/categories')
export class GetCategoriesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequireAnyPermission(
    TenantPermission.ProductsRead,
    TenantPermission.ProductsManage,
    TenantPermission.InventoryRead,
    TenantPermission.InventoryManage,
    TenantPermission.PricingManage,
  )
  async getCategories(@CurrentUser() user: AuthUser): Promise<GetCategoriesResponseDto> {
    return this.queryBus.execute<GetCategoriesQuery, GetCategoriesResult>(new GetCategoriesQuery(user.tenantId));
  }
}
