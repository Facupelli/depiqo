import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { RejectSubmittedCustomerOnboardingCommand } from './reject-submitted-customer-onboarding.command';
import {
  RejectSubmittedCustomerOnboardingError,
  RejectSubmittedCustomerOnboardingErrorCode,
} from './reject-submitted-customer-onboarding.errors';
import { RejectSubmittedCustomerOnboardingResult } from './reject-submitted-customer-onboarding.handler';
import {
  RejectSubmittedCustomerOnboardingParamsDto,
  RejectSubmittedCustomerOnboardingRequestDto,
} from './reject-submitted-customer-onboarding.request.dto';

@Controller('tenant-management/rental-customers')
export class RejectSubmittedCustomerOnboardingHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':customerId/onboarding/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  async rejectSubmittedCustomerOnboarding(
    @Param() params: RejectSubmittedCustomerOnboardingParamsDto,
    @Body() dto: RejectSubmittedCustomerOnboardingRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<
      RejectSubmittedCustomerOnboardingCommand,
      RejectSubmittedCustomerOnboardingResult
    >(new RejectSubmittedCustomerOnboardingCommand(user.tenantId, params.customerId, user.id, dto.rejectionReason));

    if (result.isErr()) {
      throw toRejectSubmittedCustomerOnboardingProblem(result.error);
    }
  }
}

function toRejectSubmittedCustomerOnboardingProblem(error: RejectSubmittedCustomerOnboardingError): ProblemException {
  const problem = rejectSubmittedCustomerOnboardingProblemMap[error.code];

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

const rejectSubmittedCustomerOnboardingProblemMap = {
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
  'tenant_management.customer_onboarding_not_pending': {
    type: createProblemType('tenant-management/customer-onboarding-not-pending'),
    title: 'Customer onboarding is not pending',
    status: HttpStatus.CONFLICT,
    detail: 'Only pending customer onboarding submissions can be reviewed.',
  },
} satisfies Record<
  RejectSubmittedCustomerOnboardingErrorCode,
  {
    type: string;
    title: string;
    status: HttpStatus;
    detail: string;
  }
>;
