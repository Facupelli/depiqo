import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { Public } from 'src/core/decorators/public.decorator';
import { SkipCsrf } from 'src/modules/tenant-management/auth/shared/csrf/skip-csrf.decorator';
import { CurrentStorefrontTenant } from 'src/modules/tenant-management/tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from 'src/modules/tenant-management/tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from 'src/modules/tenant-management/tenant-context/tenant-context.contract';

import { CalculateCartPriceApplicationError } from './calculate-cart-price-application.error';
import { CalculateCartPriceResult } from './calculate-cart-price.handler';
import { toCalculateCartPriceProblem } from './calculate-cart-price-http-error.mapper';
import { CalculateCartPriceQuery } from './calculate-cart-price.query';
import { CalculateCartPriceRequestDto } from './calculate-cart-price.request.dto';
import { CalculateCartPriceResponseDto } from './calculate-cart-price.response.dto';

@Public()
@SkipCsrf()
@Controller('storefront/pricing/cart')
@UseGuards(StorefrontTenantContextGuard)
export class CalculateCartPriceHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Post('price')
  @HttpCode(HttpStatus.OK)
  async calculateCartPrice(
    @Body() dto: CalculateCartPriceRequestDto,
    @CurrentStorefrontTenant() tenant: StorefrontTenantContext,
  ): Promise<CalculateCartPriceResponseDto> {
    const result = await this.queryBus.execute<
      CalculateCartPriceQuery,
      Result<CalculateCartPriceResult, CalculateCartPriceApplicationError>
    >(
      new CalculateCartPriceQuery(
        tenant.tenantId,
        dto.branchId,
        new Date(dto.rentalPeriod.start),
        new Date(dto.rentalPeriod.end),
        dto.selectedOffers,
        dto.insuranceSelected,
        dto.customerId,
        dto.couponCode,
      ),
    );

    if (result.isErr()) {
      throw toCalculateCartPriceProblem(result.error);
    }

    return result.value;
  }
}
