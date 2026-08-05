import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthCustomer } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantCustomerSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-customer-session.guard';

import {
  GetCurrentRentalCustomerProfileError,
  GetCurrentRentalCustomerProfileErrorCode,
} from './get-current-rental-customer-profile.errors';
import { GetCurrentRentalCustomerProfileResult } from './get-current-rental-customer-profile.handler';
import { GetCurrentRentalCustomerProfileQuery } from './get-current-rental-customer-profile.query';
import { GetCurrentRentalCustomerProfileResponseDto } from './get-current-rental-customer-profile.response.dto';

@Controller('tenant-management/rental-customers')
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

function toGetCurrentRentalCustomerProfileProblem(error: GetCurrentRentalCustomerProfileError): ProblemException {
  const problem = getCurrentRentalCustomerProfileProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const getCurrentRentalCustomerProfileProblemMap = {
  'tenant_management.rental_customer_not_found': {
    type: createProblemType('tenant-management/rental-customer-not-found'),
    title: 'Rental customer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental customer was not found.',
  },
  'tenant_management.customer_profile_not_found': {
    type: createProblemType('tenant-management/customer-profile-not-found'),
    title: 'Customer profile not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested customer profile was not found.',
  },
} satisfies Record<
  GetCurrentRentalCustomerProfileErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
