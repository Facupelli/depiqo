import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentStorefrontTenant } from '../../../tenant-management/tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from '../../../tenant-management/tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from '../../../tenant-management/tenant-context/tenant-context.contract';
import { GetStorefrontRentalOffersPricingResult } from './get-storefront-rental-offers-pricing.handler';
import { GetStorefrontRentalOffersPricingQuery } from './get-storefront-rental-offers-pricing.query';
import { GetStorefrontRentalOffersPricingRequestDto } from './get-storefront-rental-offers-pricing.request.dto';
import { GetStorefrontRentalOffersPricingResponseDto } from './get-storefront-rental-offers-pricing.response.dto';
import { SkipCsrf } from 'src/modules/v2/tenant-management/auth/shared/csrf/skip-csrf.decorator';
import { Public } from 'src/core/decorators/public.decorator';

@Public()
@SkipCsrf()
@Controller('storefront/pricing/rental-offer-pricings')
@UseGuards(StorefrontTenantContextGuard)
export class GetStorefrontRentalOffersPricingHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getStorefrontRentalOffersPricing(
    @Query() dto: GetStorefrontRentalOffersPricingRequestDto,
    @CurrentStorefrontTenant() tenant: StorefrontTenantContext,
  ): Promise<GetStorefrontRentalOffersPricingResponseDto> {
    return this.queryBus.execute<GetStorefrontRentalOffersPricingQuery, GetStorefrontRentalOffersPricingResult>(
      new GetStorefrontRentalOffersPricingQuery(tenant.tenantId, dto.rentalOfferIds),
    );
  }
}
