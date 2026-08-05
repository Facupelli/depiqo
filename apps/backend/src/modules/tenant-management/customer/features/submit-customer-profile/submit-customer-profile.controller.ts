import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthCustomer } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantCustomerSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-customer-session.guard';

import { SubmitCustomerProfileCommand } from './submit-customer-profile.command';
import { SubmitCustomerProfileError, SubmitCustomerProfileErrorCode } from './submit-customer-profile.errors';
import { SubmitCustomerProfileServiceResult } from './submit-customer-profile.handler';
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

function toSubmitCustomerProfileProblem(error: SubmitCustomerProfileError): ProblemException {
  const problem = submitCustomerProfileProblemMap[error.code];

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

const submitCustomerProfileProblemMap = {
  'tenant_management.rental_customer_not_found': {
    type: createProblemType('tenant-management/rental-customer-not-found'),
    title: 'Rental customer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The current rental customer could not be found.',
  },
  'tenant_management.customer_profile_already_pending': {
    type: createProblemType('tenant-management/customer-profile-already-pending'),
    title: 'Customer profile already pending',
    status: HttpStatus.CONFLICT,
    detail: 'The customer profile has already been submitted and is pending review.',
  },
  'tenant_management.customer_profile_already_approved': {
    type: createProblemType('tenant-management/customer-profile-already-approved'),
    title: 'Customer profile already approved',
    status: HttpStatus.CONFLICT,
    detail: 'The customer profile has already been approved.',
  },
} satisfies Record<
  SubmitCustomerProfileErrorCode,
  {
    type: string;
    title: string;
    status: HttpStatus;
    detail: string;
  }
>;
