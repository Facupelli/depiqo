import { Controller, Get, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { GetRentalDetailError, GetRentalDetailErrorCode } from './get-rental-detail.errors';
import { GetRentalDetailResult } from './get-rental-detail.handler';
import { GetRentalDetailQuery } from './get-rental-detail.query';
import { GetRentalDetailParamsDto } from './get-rental-detail.request.dto';
import type { GetRentalDetailResponseDto } from './get-rental-detail.response.dto';

@Controller('rental-commitments/rentals')
export class GetRentalDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':rentalId')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getRentalDetail(
    @Param() params: GetRentalDetailParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentalDetailResponseDto> {
    const result = await this.queryBus.execute<GetRentalDetailQuery, GetRentalDetailResult>(
      new GetRentalDetailQuery(user.tenantId, params.rentalId),
    );

    if (result.isErr()) {
      throw toGetRentalDetailProblem(result.error);
    }

    return result.value;
  }
}

function toGetRentalDetailProblem(error: GetRentalDetailError): ProblemException {
  const problem = getRentalDetailProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({ ...problem, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

const getRentalDetailProblemMap = {
  'rental_commitment.rental_not_found': {
    type: createProblemType('rental_commitment.rental_not_found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental was not found.',
  },
} satisfies Record<GetRentalDetailErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
