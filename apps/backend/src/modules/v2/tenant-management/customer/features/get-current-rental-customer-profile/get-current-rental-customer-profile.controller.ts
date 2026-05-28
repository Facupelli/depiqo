import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AUTH_ACTOR_TYPES, AuthCustomer } from 'src/modules/v2/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/v2/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/v2/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/v2/tenant-management/auth/shared/session/session-auth.guard';
import { TenantCustomerSessionGuard } from 'src/modules/v2/tenant-management/auth/shared/session/tenant-customer-session.guard';

import { GetCurrentRentalCustomerProfileResult } from './get-current-rental-customer-profile.handler';
import { toGetCurrentRentalCustomerProfileProblem } from './get-current-rental-customer-profile-http-error.mapper';
import { GetCurrentRentalCustomerProfileQuery } from './get-current-rental-customer-profile.query';
import { GetCurrentRentalCustomerProfileResponseDto } from './get-current-rental-customer-profile.response.dto';

@Controller('v2/tenant-management/rental-customers')
export class GetCurrentRentalCustomerProfileHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('me/profile')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_CUSTOMER)
  @UseGuards(SessionAuthGuard, TenantCustomerSessionGuard)
  async getCurrentRentalCustomerProfile(
    @CurrentUser() user: AuthCustomer,
  ): Promise<GetCurrentRentalCustomerProfileResponseDto> {
    const result = await this.queryBus.execute<
      GetCurrentRentalCustomerProfileQuery,
      GetCurrentRentalCustomerProfileResult
    >(new GetCurrentRentalCustomerProfileQuery(user.tenantId, user.id));

    if (result.isErr()) {
      throw toGetCurrentRentalCustomerProfileProblem(result.error);
    }

    return result.value;
  }
}
