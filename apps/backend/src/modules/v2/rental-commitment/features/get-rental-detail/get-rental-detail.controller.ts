import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/v2/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/v2/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/v2/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/v2/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/v2/tenant-management/auth/shared/session/tenant-user-session.guard';

import { GetRentalDetailResult } from './get-rental-detail.handler';
import { toGetRentalDetailProblem } from './get-rental-detail-http-error.mapper';
import { GetRentalDetailQuery } from './get-rental-detail.query';
import { GetRentalDetailParamsDto } from './get-rental-detail.request.dto';
import type { GetRentalDetailResponseDto } from './get-rental-detail.response.dto';

@Controller('v2/rental-commitments/rentals')
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
