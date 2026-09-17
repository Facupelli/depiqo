import { TenantPermission } from '@repo/api-contracts';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { RequireAnyPermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import { AUTH_ACTOR_TYPES, AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from '../../../tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from '../../../tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from '../../../tenant-management/auth/shared/session/tenant-user-session.guard';
import { GetRentalOffersPricingResult } from './get-rental-offers-pricing.handler';
import { GetRentalOffersPricingQuery } from './get-rental-offers-pricing.query';
import { GetRentalOffersPricingRequestDto } from './get-rental-offers-pricing.request.dto';
import { GetRentalOffersPricingResponseDto } from './get-rental-offers-pricing.response.dto';

@Controller('pricing/rental-offer-pricings')
export class GetRentalOffersPricingHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequireAnyPermission(
    TenantPermission.PricingRead,
    TenantPermission.PricingManage,
    TenantPermission.RentalsProposalsManage,
  )
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getRentalOffersPricing(
    @Query() dto: GetRentalOffersPricingRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentalOffersPricingResponseDto> {
    return this.queryBus.execute<GetRentalOffersPricingQuery, GetRentalOffersPricingResult>(
      new GetRentalOffersPricingQuery(user.tenantId, dto.rentalOfferIds),
    );
  }
}
