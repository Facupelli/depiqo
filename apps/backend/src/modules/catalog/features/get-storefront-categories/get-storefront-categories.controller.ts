import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { Public } from 'src/core/decorators/public.decorator';
import { SkipCsrf } from 'src/modules/tenant-management/auth/shared/csrf/skip-csrf.decorator';
import { CurrentStorefrontTenant } from '../../../tenant-management/tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from '../../../tenant-management/tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from '../../../tenant-management/tenant-context/tenant-context.contract';
import { GetStorefrontCategoriesResult } from './get-storefront-categories.handler';
import { GetStorefrontCategoriesQuery } from './get-storefront-categories.query';
import type { GetStorefrontCategoriesResponseDto } from './get-storefront-categories.response.dto';

@Public()
@SkipCsrf()
@Controller('storefront/catalog/categories')
@UseGuards(StorefrontTenantContextGuard)
export class GetStorefrontCategoriesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getStorefrontCategories(
    @CurrentStorefrontTenant() tenant: StorefrontTenantContext,
  ): Promise<GetStorefrontCategoriesResponseDto> {
    return this.queryBus.execute<GetStorefrontCategoriesQuery, GetStorefrontCategoriesResult>(
      new GetStorefrontCategoriesQuery(tenant.tenantId),
    );
  }
}
