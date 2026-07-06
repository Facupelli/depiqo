import { Controller, Delete, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { CancelRentalCommand } from './cancel-rental.command';
import { CancelRentalResult } from './cancel-rental.handler';
import { toCancelRentalProblem } from './cancel-rental-http-error.mapper';
import { CancelRentalParamsDto } from './cancel-rental.request.dto';

@Controller('v2/rental-commitments/rentals')
export class CancelRentalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':rentalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async cancel(@Param() params: CancelRentalParamsDto, @CurrentUser() user: AuthUser): Promise<void> {
    const result = await this.commandBus.execute<CancelRentalCommand, CancelRentalResult>(
      new CancelRentalCommand(user.tenantId, params.rentalId),
    );

    if (result.isErr()) {
      throw toCancelRentalProblem(result.error);
    }
  }
}
