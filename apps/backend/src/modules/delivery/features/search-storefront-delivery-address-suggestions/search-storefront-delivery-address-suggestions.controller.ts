import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { Public } from 'src/core/decorators/public.decorator';
import { SkipCsrf } from 'src/modules/tenant-management/auth/shared/csrf/skip-csrf.decorator';
import { StorefrontTenantContextGuard } from '../../../tenant-management/tenant-context/guards/storefront-tenant-context.guard';
import { SearchStorefrontDeliveryAddressSuggestionsResult } from './search-storefront-delivery-address-suggestions.handler';
import { SearchStorefrontDeliveryAddressSuggestionsQuery } from './search-storefront-delivery-address-suggestions.query';
import { SearchStorefrontDeliveryAddressSuggestionsRequestDto } from './search-storefront-delivery-address-suggestions.request.dto';
import type { SearchStorefrontDeliveryAddressSuggestionsResponseDto } from './search-storefront-delivery-address-suggestions.response.dto';

@Public()
@SkipCsrf()
@Controller('storefront/delivery')
@UseGuards(StorefrontTenantContextGuard)
export class SearchStorefrontDeliveryAddressSuggestionsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('address-suggestions')
  async search(
    @Query() dto: SearchStorefrontDeliveryAddressSuggestionsRequestDto,
  ): Promise<SearchStorefrontDeliveryAddressSuggestionsResponseDto> {
    return this.queryBus.execute<
      SearchStorefrontDeliveryAddressSuggestionsQuery,
      SearchStorefrontDeliveryAddressSuggestionsResult
    >(new SearchStorefrontDeliveryAddressSuggestionsQuery(dto.text));
  }
}
