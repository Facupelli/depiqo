import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { Public } from 'src/core/decorators/public.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { SkipCsrf } from 'src/modules/tenant-management/auth/shared/csrf/skip-csrf.decorator';
import { CurrentStorefrontTenant } from 'src/modules/tenant-management/tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from 'src/modules/tenant-management/tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from 'src/modules/tenant-management/tenant-context/tenant-context.contract';

import {
  CalculateProspectiveCartCostError,
  CalculateProspectiveCartCostErrorCode,
} from './calculate-prospective-cart-cost.errors';
import { CalculateProspectiveCartCostResult } from './calculate-prospective-cart-cost.handler';
import { CalculateProspectiveCartCostQuery } from './calculate-prospective-cart-cost.query';
import { CalculateProspectiveCartCostRequestDto } from './calculate-prospective-cart-cost.request.dto';
import { CalculateProspectiveCartCostResponseDto } from './calculate-prospective-cart-cost.response.dto';

@Public()
@SkipCsrf()
@Controller('storefront/rental-commitment/cart')
@UseGuards(StorefrontTenantContextGuard)
export class CalculateProspectiveCartCostHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Post('prospective-cost')
  @HttpCode(HttpStatus.OK)
  async calculate(
    @Body() dto: CalculateProspectiveCartCostRequestDto,
    @CurrentStorefrontTenant() tenant: StorefrontTenantContext,
  ): Promise<CalculateProspectiveCartCostResponseDto> {
    const result = await this.queryBus.execute<CalculateProspectiveCartCostQuery, CalculateProspectiveCartCostResult>(
      new CalculateProspectiveCartCostQuery(
        tenant.tenantId,
        dto.branchId,
        dto.rentalPeriod.start,
        dto.rentalPeriod.end,
        dto.selectedOffers,
        dto.insuranceSelected,
        dto.couponCode,
        dto.fulfillmentMethod,
        dto.deliveryDetails,
      ),
    );

    if (result.isErr()) throw toProblem(result.error);
    return result.value;
  }
}

function toProblem(error: CalculateProspectiveCartCostError): ProblemException {
  const definition = problemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({ ...definition, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

const problemMap = {
  'rental_commitment.invalid_prospective_cart': problem(
    'invalid_prospective_cart',
    'Invalid prospective cart',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The prospective cart input is invalid.',
  ),
  'rental_commitment.branch_not_found': problem(
    'branch_not_found',
    'Branch not found',
    HttpStatus.NOT_FOUND,
    'The requested branch was not found.',
  ),
  'rental_commitment.tenant_config_unavailable': problem(
    'tenant_config_unavailable',
    'Tenant configuration unavailable',
    HttpStatus.SERVICE_UNAVAILABLE,
    'Tenant configuration is temporarily unavailable.',
  ),
  'rental_commitment.rental_offer_not_found': problem(
    'rental_offer_not_found',
    'Rental offer not found',
    HttpStatus.NOT_FOUND,
    'One or more selected rental offers could not be found.',
  ),
  'rental_commitment.rental_offer_not_selectable': problem(
    'rental_offer_not_selectable',
    'Rental offer unavailable',
    HttpStatus.CONFLICT,
    'One or more selected rental offers are not currently available.',
  ),
  'rental_commitment.invalid_pricing_input': problem(
    'invalid_pricing_input',
    'Invalid pricing input',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The cart could not be priced with the provided input.',
  ),
  'rental_commitment.coupon_not_applicable': problem(
    'coupon_not_applicable',
    'Coupon not applicable',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The requested coupon could not be applied to this cart.',
  ),
  'rental_commitment.pricing_unavailable': problem(
    'pricing_unavailable',
    'Pricing unavailable',
    HttpStatus.CONFLICT,
    'Current pricing cannot produce a price for the selected cart.',
  ),
} satisfies Record<CalculateProspectiveCartCostErrorCode, ProblemDefinition>;

type ProblemDefinition = { type: string; title: string; status: HttpStatus; detail: string };

function problem(slug: string, title: string, status: HttpStatus, detail: string): ProblemDefinition {
  return { type: createProblemType(`rental_commitment.${slug}`), title, status, detail };
}
