import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { GetCustomerSummaryResult } from './get-customer-summary.handler';
import { toGetCustomerSummaryProblem } from './get-customer-summary-http-error.mapper';
import { GetCustomerSummaryQuery } from './get-customer-summary.query';
import { GetCustomerSummaryParamsDto } from './get-customer-summary.request.dto';
import { GetCustomerSummaryResponseDto } from './get-customer-summary.response.dto';

@Controller('tenant-management/rental-customers')
export class GetCustomerSummaryHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':customerId')
  async getCustomerSummary(
    @Param() params: GetCustomerSummaryParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetCustomerSummaryResponseDto> {
    const result = await this.queryBus.execute<GetCustomerSummaryQuery, GetCustomerSummaryResult>(
      new GetCustomerSummaryQuery(user.tenantId, params.customerId),
    );

    if (result.isErr()) {
      throw toGetCustomerSummaryProblem(result.error);
    }

    return result.value;
  }
}
