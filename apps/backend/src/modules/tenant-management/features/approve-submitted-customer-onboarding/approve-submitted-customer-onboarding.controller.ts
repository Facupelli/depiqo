import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { ApproveSubmittedCustomerOnboardingCommand } from './approve-submitted-customer-onboarding.command';
import { toApproveSubmittedCustomerOnboardingProblem } from './approve-submitted-customer-onboarding-http-error.mapper';
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
