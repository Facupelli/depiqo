import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { Public } from 'src/core/decorators/public.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { SkipCsrf } from 'src/modules/tenant-management/auth/shared/csrf/skip-csrf.decorator';
import { CurrentStorefrontTenant } from 'src/modules/tenant-management/tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from 'src/modules/tenant-management/tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from 'src/modules/tenant-management/tenant-context/tenant-context.contract';

import { CalculateCartPriceError, CalculateCartPriceErrorCode } from './calculate-cart-price.errors';
import { CalculateCartPriceResult } from './calculate-cart-price.handler';
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
      Result<CalculateCartPriceResult, CalculateCartPriceError>
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

function toCalculateCartPriceProblem(error: CalculateCartPriceError): ProblemException {
  const problem = calculateCartPriceProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: {
        code: error.code,
      },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const calculateCartPriceProblemMap = {
  'pricing.invalid_cart_selection': {
    type: createProblemType('pricing.invalid_cart_selection'),
    title: 'Invalid cart selection',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The cart selection is invalid.',
  },
  'pricing.invalid_rental_period': {
    type: createProblemType('pricing.invalid_rental_period'),
    title: 'Invalid rental period',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rental period is invalid.',
  },
  'pricing.branch_not_found': {
    type: createProblemType('pricing.branch_not_found'),
    title: 'Branch not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested branch was not found.',
  },
  'pricing.tenant_config_unavailable': {
    type: createProblemType('pricing.tenant_config_unavailable'),
    title: 'Tenant pricing config unavailable',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    detail: 'The tenant pricing configuration is temporarily unavailable.',
  },
  'pricing.rental_offer_not_found': {
    type: createProblemType('pricing.rental_offer_not_found'),
    title: 'Rental offer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'One or more selected rental offers could not be found.',
  },
  'pricing.rental_offer_not_selectable': {
    type: createProblemType('pricing.rental_offer_not_selectable'),
    title: 'Rental offer unavailable',
    status: HttpStatus.CONFLICT,
    detail: 'One or more selected rental offers are not currently available.',
  },
  'pricing.rentable_item_inactive': {
    type: createProblemType('pricing.rentable_item_inactive'),
    title: 'Rentable item inactive',
    status: HttpStatus.CONFLICT,
    detail: 'One or more selected rentable items are not currently active.',
  },
  'pricing.missing_active_pricing': {
    type: createProblemType('pricing.missing_active_pricing'),
    title: 'Missing active pricing',
    status: HttpStatus.CONFLICT,
    detail: 'One or more selected rental offers do not have active pricing.',
  },
  'pricing.coupon_requires_customer': {
    type: createProblemType('pricing.coupon_requires_customer'),
    title: 'Coupon requires customer',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'A customer is required to apply this coupon.',
  },
  'pricing.coupon_not_applicable': {
    type: createProblemType('pricing.coupon_not_applicable'),
    title: 'Coupon not applicable',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested coupon could not be applied to this cart.',
  },
} satisfies Record<
  CalculateCartPriceErrorCode,
  {
    type: string;
    title: string;
    status: HttpStatus;
    detail: string;
  }
>;
