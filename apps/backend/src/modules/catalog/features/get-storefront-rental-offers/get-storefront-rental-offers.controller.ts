import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentStorefrontTenant } from '../../../tenant-management/tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from '../../../tenant-management/tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from '../../../tenant-management/tenant-context/tenant-context.contract';
import { GetStorefrontRentalOffersResult } from './get-storefront-rental-offers.handler';
import { GetStorefrontRentalOffersQuery } from './get-storefront-rental-offers.query';
import { GetStorefrontRentalOffersRequestDto } from './get-storefront-rental-offers.request.dto';
import type { GetStorefrontRentalOffersResponseDto } from './get-storefront-rental-offers.response.dto';
import { Public } from 'src/core/decorators/public.decorator';
import { SkipCsrf } from 'src/modules/tenant-management/auth/shared/csrf/skip-csrf.decorator';

@Public()
@SkipCsrf()
@Controller('storefront/catalog/rental-offers')
@UseGuards(StorefrontTenantContextGuard)
export class GetStorefrontRentalOffersHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getStorefrontRentalOffers(
    @Query() dto: GetStorefrontRentalOffersRequestDto,
    @CurrentStorefrontTenant() tenant: StorefrontTenantContext,
  ): Promise<GetStorefrontRentalOffersResponseDto> {
    return this.queryBus.execute<GetStorefrontRentalOffersQuery, GetStorefrontRentalOffersResult>(
      new GetStorefrontRentalOffersQuery(
        tenant.tenantId,
        dto.branchId,
        dto.page,
        dto.pageSize,
        dto.kind,
        dto.categoryId,
        dto.search,
        dto.publishedAfter,
        dto.sort,
      ),
    );
  }
}
