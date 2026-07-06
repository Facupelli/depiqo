import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { AUTH_ACTOR_TYPES, AuthCustomer } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantCustomerSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-customer-session.guard';

import { SubmitCustomerProfileCommand } from './submit-customer-profile.command';
import { SubmitCustomerProfileServiceResult } from './submit-customer-profile.handler';
import { toSubmitCustomerProfileProblem } from './submit-customer-profile-http-error.mapper';
import { SubmitCustomerProfileRequestDto } from './submit-customer-profile.request.dto';
import { SubmitCustomerProfileResponseDto } from './submit-customer-profile.response.dto';

@Controller('tenant-management/customer/profile')
export class SubmitCustomerProfileHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_CUSTOMER)
  @UseGuards(SessionAuthGuard, TenantCustomerSessionGuard)
  async submit(
    @Body() dto: SubmitCustomerProfileRequestDto,
    @CurrentUser() user: AuthCustomer,
  ): Promise<SubmitCustomerProfileResponseDto> {
    const result = await this.commandBus.execute<SubmitCustomerProfileCommand, SubmitCustomerProfileServiceResult>(
      new SubmitCustomerProfileCommand({
        tenantId: user.tenantId,
        customerId: user.id,
        profile: dto,
      }),
    );

    if (result.isErr()) {
      throw toSubmitCustomerProfileProblem(result.error);
    }

    return { id: result.value.id };
  }
}
