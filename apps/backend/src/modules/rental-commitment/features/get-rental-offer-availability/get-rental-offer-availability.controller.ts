import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { rentalCommitmentApplicationError } from '../create-confirmed-rental/rental-commitment-application.error';
import { toRentalCommitmentProblem } from '../create-confirmed-rental/rental-commitment-http-error.mapper';
import {
  GetRentalOfferAvailabilityError,
  GetRentalOfferAvailabilityErrorCode,
} from './get-rental-offer-availability.errors';
import { GetRentalOfferAvailabilityResult } from './get-rental-offer-availability.handler';
import { GetRentalOfferAvailabilityQuery } from './get-rental-offer-availability.query';
import { GetRentalOfferAvailabilityRequestDto } from './get-rental-offer-availability.request.dto';
import type { GetRentalOfferAvailabilityResponseDto } from './get-rental-offer-availability.response.dto';

@Controller('rental-commitment/rental-offers/availability')
export class GetRentalOfferAvailabilityHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getAvailability(
    @Body() dto: GetRentalOfferAvailabilityRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentalOfferAvailabilityResponseDto> {
    let period: RentalPeriod;

    try {
      period = new RentalPeriod(dto.periodStart, dto.periodEnd);
    } catch (error) {
      throw toRentalCommitmentProblem(
        rentalCommitmentApplicationError('InvalidRentalPeriod', 'Invalid rental period.', error),
      );
    }

    const result = await this.queryBus.execute<GetRentalOfferAvailabilityQuery, GetRentalOfferAvailabilityResult>(
      new GetRentalOfferAvailabilityQuery(user.tenantId, dto.branchId, period, dto.rentalOfferIds),
    );
    if (result.isErr()) throw toAvailabilityProblem(result.error);
    return result.value;
  }
}

function toAvailabilityProblem(error: GetRentalOfferAvailabilityError): ProblemException {
  const definition = availabilityProblemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...definition,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const availabilityProblemMap = {
  'rental_commitment.rental_offer_not_found': {
    type: createProblemType('rental_commitment.rental_offer_not_found'),
    title: 'Rental offer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental offer could not be found.',
  },
  'rental_commitment.rental_offer_not_rentable': {
    type: createProblemType('rental_commitment.rental_offer_not_rentable'),
    title: 'Rental offer not rentable',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental offer is not rentable.',
  },
  'rental_commitment.rentable_item_not_active': {
    type: createProblemType('rental_commitment.rentable_item_not_active'),
    title: 'Rentable item not active',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental offer does not reference an active rentable item.',
  },
  'rental_commitment.invalid_fulfillment_definition': {
    type: createProblemType('rental_commitment.invalid_fulfillment_definition'),
    title: 'Invalid fulfillment definition',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental offer has an invalid fulfillment definition.',
  },
  'rental_commitment.invalid_candidate_projection': {
    type: createProblemType('rental_commitment.invalid_candidate_projection'),
    title: 'Invalid candidate projection',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Availability could not be determined from the current asset candidate projection.',
  },
  'rental_commitment.tenant_unavailable': {
    type: createProblemType('rental_commitment.tenant_unavailable'),
    title: 'Tenant unavailable',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant is not available for rental availability.',
  },
} satisfies Record<
  GetRentalOfferAvailabilityErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
