import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { ApproveSubmittedCustomerOnboardingCommand } from './approve-submitted-customer-onboarding.command';
import {
  ApproveSubmittedCustomerOnboardingError,
  ApproveSubmittedCustomerOnboardingErrorCode,
} from './approve-submitted-customer-onboarding.errors';
import { ApproveSubmittedCustomerOnboardingResult } from './approve-submitted-customer-onboarding.handler';
import { ApproveSubmittedCustomerOnboardingParamsDto } from './approve-submitted-customer-onboarding.request.dto';

@Controller('tenant-management/rental-customers')
export class ApproveSubmittedCustomerOnboardingHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':customerId/onboarding/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  async approveSubmittedCustomerOnboarding(
    @Param() params: ApproveSubmittedCustomerOnboardingParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<
      ApproveSubmittedCustomerOnboardingCommand,
      ApproveSubmittedCustomerOnboardingResult
    >(new ApproveSubmittedCustomerOnboardingCommand(user.tenantId, params.customerId, user.id));

    if (result.isErr()) {
      throw toApproveSubmittedCustomerOnboardingProblem(result.error);
    }
  }
}

function toApproveSubmittedCustomerOnboardingProblem(error: ApproveSubmittedCustomerOnboardingError): ProblemException {
  const problem = approveSubmittedCustomerOnboardingProblemMap[error.code];

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

const approveSubmittedCustomerOnboardingProblemMap = {
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
  ApproveSubmittedCustomerOnboardingErrorCode,
  {
    type: string;
    title: string;
    status: HttpStatus;
    detail: string;
  }
>;
