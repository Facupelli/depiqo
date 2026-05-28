import { Body, Controller, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/v2/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/v2/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/v2/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/v2/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/v2/tenant-management/auth/shared/session/tenant-user-session.guard';

import { AssignRentalAccessoriesCommand } from './assign-rental-accessories.command';
import { AssignRentalAccessoriesResult } from './assign-rental-accessories.handler';
import {
  AssignRentalAccessoriesParamsDto,
  AssignRentalAccessoriesRequestDto,
} from './assign-rental-accessories.request.dto';
import { toAssignRentalAccessoriesProblem } from './assign-rental-accessories-http-error.mapper';

@Controller('v2/rental-commitments/rentals')
export class AssignRentalAccessoriesHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':rentalId/accessories')
  @HttpCode(HttpStatus.CREATED)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async assignAccessories(
    @Param() params: AssignRentalAccessoriesParamsDto,
    @Body() dto: AssignRentalAccessoriesRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<AssignRentalAccessoriesCommand, AssignRentalAccessoriesResult>(
      new AssignRentalAccessoriesCommand({
        tenantId: user.tenantId,
        rentalId: params.rentalId,
        accessories: dto.accessories,
      }),
    );

    if (result.isErr()) {
      throw toAssignRentalAccessoriesProblem(result.error);
    }
  }
}
