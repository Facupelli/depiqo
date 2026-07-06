import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { rentalCommitmentApplicationError } from '../create-confirmed-rental/rental-commitment-application.error';
import { toRentalCommitmentProblem } from '../create-confirmed-rental/rental-commitment-http-error.mapper';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
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

    return this.queryBus.execute<GetRentalOfferAvailabilityQuery, GetRentalOfferAvailabilityResult>(
      new GetRentalOfferAvailabilityQuery(user.tenantId, dto.branchId, period, dto.rentalOffers),
    );
  }
}
