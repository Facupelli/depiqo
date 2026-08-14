import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { GetRentalContractSigningSummaryResult } from './get-rental-contract-signing-summary.handler';
import { GetRentalContractSigningSummaryQuery } from './get-rental-contract-signing-summary.query';
import { GetRentalContractSigningSummaryParamsDto } from './get-rental-contract-signing-summary.request.dto';
import type { GetRentalContractSigningSummaryResponseDto } from './get-rental-contract-signing-summary.response.dto';

@Controller('contracts/rentals')
export class GetRentalContractSigningSummaryHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':rentalId/signing-summary')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getRentalContractSigningSummary(
    @Param() params: GetRentalContractSigningSummaryParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentalContractSigningSummaryResponseDto> {
    return this.queryBus.execute<GetRentalContractSigningSummaryQuery, GetRentalContractSigningSummaryResult>(
      new GetRentalContractSigningSummaryQuery(user.tenantId, params.rentalId),
    );
  }
}
