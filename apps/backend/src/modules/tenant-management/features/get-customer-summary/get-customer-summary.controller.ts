import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { GetCustomerSummaryError, GetCustomerSummaryErrorCode } from './get-customer-summary.errors';
import { GetCustomerSummaryResult } from './get-customer-summary.handler';
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

function toGetCustomerSummaryProblem(error: GetCustomerSummaryError): ProblemException {
  const problem = getCustomerSummaryProblemMap[error.code];

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

const getCustomerSummaryProblemMap = {
  'tenant_management.rental_customer_not_found': {
    type: createProblemType('tenant-management/rental-customer-not-found'),
    title: 'Rental customer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental customer was not found.',
  },
} satisfies Record<GetCustomerSummaryErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
