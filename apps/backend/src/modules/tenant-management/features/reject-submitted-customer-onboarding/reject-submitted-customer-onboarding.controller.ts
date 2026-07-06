import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { RejectSubmittedCustomerOnboardingCommand } from './reject-submitted-customer-onboarding.command';
import { toRejectSubmittedCustomerOnboardingProblem } from './reject-submitted-customer-onboarding-http-error.mapper';
import { RejectSubmittedCustomerOnboardingResult } from './reject-submitted-customer-onboarding.handler';
import {
  RejectSubmittedCustomerOnboardingParamsDto,
  RejectSubmittedCustomerOnboardingRequestDto,
} from './reject-submitted-customer-onboarding.request.dto';

@Controller('v2/tenant-management/rental-customers')
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
