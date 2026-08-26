import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AUTH_ACTOR_TYPES, AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from '../../../tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from '../../../tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from '../../../tenant-management/auth/shared/session/tenant-user-session.guard';
import { SearchRentalOffersResult } from './search-rental-offers.handler';
import { SearchRentalOffersQuery } from './search-rental-offers.query';
import { SearchRentalOffersRequestDto } from './search-rental-offers.request.dto';
import type { SearchRentalOffersResponseDto } from './search-rental-offers.response.dto';

@Controller('catalog/rental-offers/search')
export class SearchRentalOffersHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async searchRentalOffers(
    @Query() dto: SearchRentalOffersRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SearchRentalOffersResponseDto> {
    return this.queryBus.execute<SearchRentalOffersQuery, SearchRentalOffersResult>(
      new SearchRentalOffersQuery(user.tenantId, dto.branchId, dto.page, dto.pageSize, dto.search),
    );
  }
}
