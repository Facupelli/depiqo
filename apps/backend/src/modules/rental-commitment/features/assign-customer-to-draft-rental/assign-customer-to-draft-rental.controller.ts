import { Body, Controller, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { AssignCustomerToDraftRentalCommand } from './assign-customer-to-draft-rental.command';
import { AssignCustomerToDraftRentalResult } from './assign-customer-to-draft-rental.handler';
import {
  AssignCustomerToDraftRentalParamsDto,
  AssignCustomerToDraftRentalRequestDto,
} from './assign-customer-to-draft-rental.request.dto';
import { toAssignCustomerToDraftRentalProblem } from './assign-customer-to-draft-rental-http-error.mapper';

@Controller('v2/rental-commitments/rentals')
export class AssignCustomerToDraftRentalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':rentalId/customer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async assignCustomer(
    @Param() params: AssignCustomerToDraftRentalParamsDto,
    @Body() dto: AssignCustomerToDraftRentalRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<AssignCustomerToDraftRentalCommand, AssignCustomerToDraftRentalResult>(
      new AssignCustomerToDraftRentalCommand({
        tenantId: user.tenantId,
        rentalId: params.rentalId,
        customerId: dto.customerId,
      }),
    );

    if (result.isErr()) {
      throw toAssignCustomerToDraftRentalProblem(result.error);
    }
  }
}
