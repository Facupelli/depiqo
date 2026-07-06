import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { GetRentalsCalendarResult } from './get-rentals-calendar.handler';
import { GetRentalsCalendarQuery } from './get-rentals-calendar.query';
import { GetRentalsCalendarRequestDto } from './get-rentals-calendar.request.dto';
import type { GetRentalsCalendarResponseDto } from './get-rentals-calendar.response.dto';

@Controller('v2/rental-commitments/rentals/calendar')
export class GetRentalsCalendarHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getRentalsCalendar(
    @Query() dto: GetRentalsCalendarRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentalsCalendarResponseDto> {
    return this.queryBus.execute<GetRentalsCalendarQuery, GetRentalsCalendarResult>(
      new GetRentalsCalendarQuery(user.tenantId, dto.branchId, dto.from, dto.to),
    );
  }
}
