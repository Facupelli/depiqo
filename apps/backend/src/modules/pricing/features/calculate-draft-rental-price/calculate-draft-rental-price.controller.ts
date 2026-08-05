import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import {
  CalculateDraftRentalPriceError,
  CalculateDraftRentalPriceErrorCode,
} from './calculate-draft-rental-price.errors';
import { CalculateDraftRentalPriceResult } from './calculate-draft-rental-price.handler';
import { CalculateDraftRentalPriceQuery } from './calculate-draft-rental-price.query';
import { CalculateDraftRentalPriceRequestDto } from './calculate-draft-rental-price.request.dto';
import { CalculateDraftRentalPriceResponseDto } from './calculate-draft-rental-price.response.dto';

@Controller('pricing/draft-rentals')
export class CalculateDraftRentalPriceHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Post('price')
  @HttpCode(HttpStatus.OK)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async calculateDraftRentalPrice(
    @Body() dto: CalculateDraftRentalPriceRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CalculateDraftRentalPriceResponseDto> {
    const result = await this.queryBus.execute<
      CalculateDraftRentalPriceQuery,
      Result<CalculateDraftRentalPriceResult, CalculateDraftRentalPriceError>
    >(
      new CalculateDraftRentalPriceQuery(
        user.tenantId,
        user.id,
        dto.branchId,
        dto.period.start,
        dto.period.end,
        dto.selectedOffers,
        dto.manualPricingAdjustment,
        dto.rentalCustomerId,
      ),
    );

    if (result.isErr()) {
      throw toCalculateDraftRentalPriceProblem(result.error);
    }

    return result.value;
  }
}

function toCalculateDraftRentalPriceProblem(error: CalculateDraftRentalPriceError): ProblemException {
  const problem = calculateDraftRentalPriceProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const calculateDraftRentalPriceProblemMap = {
  'pricing.invalid_draft_rental_selection': {
    type: createProblemType('pricing.invalid_draft_rental_selection'),
    title: 'Invalid draft rental selection',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The draft rental selection is invalid.',
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
    detail: 'One or more requested rental offers were not found.',
  },
  'pricing.rental_offer_not_selectable': {
    type: createProblemType('pricing.rental_offer_not_selectable'),
    title: 'Rental offer unavailable',
    status: HttpStatus.CONFLICT,
    detail: 'One or more requested rental offers are not currently available.',
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
    detail: 'One or more requested rental offers do not have active pricing.',
  },
  'pricing.invalid_pricing_configuration': {
    type: createProblemType('pricing.invalid_pricing_configuration'),
    title: 'Invalid pricing configuration',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The draft rental price could not be calculated with the current pricing configuration.',
  },
} satisfies Record<
  CalculateDraftRentalPriceErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
