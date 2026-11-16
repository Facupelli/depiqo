import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { ConfirmRentalCommand } from './confirm-rental.command';
import { ConfirmRentalResult } from './confirm-rental.handler';
import { toConfirmRentalProblem } from './confirm-rental.http-errors';
import { ConfirmRentalBodyDto, ConfirmRentalParamsDto } from './confirm-rental.request.dto';

@Controller('rental-commitments/rentals')
export class ConfirmRentalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':rentalId/confirm')
  @RequirePermission(TenantPermission.RentalsConfirm)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async confirm(
    @Param() params: ConfirmRentalParamsDto,
    @Body() body: ConfirmRentalBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<ConfirmRentalCommand, ConfirmRentalResult>(
      new ConfirmRentalCommand(user.tenantId, params.rentalId, body.expectedVersion),
    );
    if (result.isErr()) throw toConfirmRentalProblem(result.error);
  }
}
