import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { GetCustomerProfileDetailError, GetCustomerProfileDetailErrorCode } from './get-customer-profile-detail.errors';
import { GetCustomerProfileDetailResult } from './get-customer-profile-detail.handler';
import { GetCustomerProfileDetailQuery } from './get-customer-profile-detail.query';
import { GetCustomerProfileDetailParamsDto } from './get-customer-profile-detail.request.dto';
import { GetCustomerProfileDetailResponseDto } from './get-customer-profile-detail.response.dto';

@Controller('tenant-management/rental-customers')
export class GetCustomerProfileDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':customerId/profile')
  async getCustomerProfileDetail(
    @Param() params: GetCustomerProfileDetailParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetCustomerProfileDetailResponseDto> {
    const result = await this.queryBus.execute<GetCustomerProfileDetailQuery, GetCustomerProfileDetailResult>(
      new GetCustomerProfileDetailQuery(user.tenantId, params.customerId),
    );

    if (result.isErr()) {
      throw toGetCustomerProfileDetailProblem(result.error);
    }

    return result.value;
  }
}

function toGetCustomerProfileDetailProblem(error: GetCustomerProfileDetailError): ProblemException {
  const problem = getCustomerProfileDetailProblemMap[error.code];

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

const getCustomerProfileDetailProblemMap = {
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
  GetCustomerProfileDetailErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
