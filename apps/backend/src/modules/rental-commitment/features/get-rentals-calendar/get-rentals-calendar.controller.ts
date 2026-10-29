import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { GetRentalsCalendarError, GetRentalsCalendarErrorCode } from './get-rentals-calendar.errors';
import { GetRentalsCalendarResult } from './get-rentals-calendar.handler';
import { GetRentalsCalendarQuery } from './get-rentals-calendar.query';
import { GetRentalsCalendarRequestDto } from './get-rentals-calendar.request.dto';
import type { GetRentalsCalendarResponseDto } from './get-rentals-calendar.response.dto';

@Controller('rental-commitments/rentals/calendar')
export class GetRentalsCalendarHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermission(TenantPermission.RentalsRead)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getRentalsCalendar(
    @Query() dto: GetRentalsCalendarRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentalsCalendarResponseDto> {
    const result = await this.queryBus.execute<GetRentalsCalendarQuery, GetRentalsCalendarResult>(
      new GetRentalsCalendarQuery(user.tenantId, dto.branchId, dto.from, dto.to),
    );
    if (result.isErr()) throw toCalendarProblem(result.error);
    return result.value;
  }
}

function toCalendarProblem(error: GetRentalsCalendarError): ProblemException {
  const definition = calendarProblemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({ ...definition, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

const calendarProblemMap = {
  'rental_commitment.branch_not_found': {
    type: createProblemType('rental_commitment.branch_not_found'),
    title: 'Branch not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested branch was not found.',
  },
  'rental_commitment.tenant_config_invalid': {
    type: createProblemType('rental_commitment.tenant_config_invalid'),
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'The rental calendar could not be loaded.',
  },
} satisfies Record<GetRentalsCalendarErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
