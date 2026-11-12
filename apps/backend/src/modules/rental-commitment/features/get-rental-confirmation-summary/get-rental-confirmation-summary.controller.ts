import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { toConfirmRentalProblem } from '../confirm-rental/confirm-rental.http-errors';
import { ConfirmRentalParamsDto } from '../confirm-rental/confirm-rental.request.dto';
import { GetRentalConfirmationSummaryResult } from './get-rental-confirmation-summary.handler';
import { GetRentalConfirmationSummaryQuery } from './get-rental-confirmation-summary.query';
import { GetRentalConfirmationSummaryResponseDto } from './get-rental-confirmation-summary.response.dto';

@Controller('rental-commitments/rentals')
export class GetRentalConfirmationSummaryHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':rentalId/confirmation-summary')
  @RequirePermission(TenantPermission.RentalsConfirm)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getSummary(
    @Param() params: ConfirmRentalParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentalConfirmationSummaryResponseDto> {
    const result = await this.queryBus.execute<GetRentalConfirmationSummaryQuery, GetRentalConfirmationSummaryResult>(
      new GetRentalConfirmationSummaryQuery(user.tenantId, params.rentalId),
    );
    if (result.isErr()) throw toConfirmRentalProblem(result.error);
    return GetRentalConfirmationSummaryResponseDto.schema.parse(result.value);
  }
}
