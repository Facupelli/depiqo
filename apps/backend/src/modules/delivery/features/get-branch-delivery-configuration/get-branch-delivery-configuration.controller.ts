import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';

import {
  GetBranchDeliveryConfigurationError,
  GetBranchDeliveryConfigurationErrorCode,
} from './get-branch-delivery-configuration.errors';
import { GetBranchDeliveryConfigurationResult } from './get-branch-delivery-configuration.handler';
import { GetBranchDeliveryConfigurationQuery } from './get-branch-delivery-configuration.query';
import { GetBranchDeliveryConfigurationParamsDto } from './get-branch-delivery-configuration.request.dto';
import { GetBranchDeliveryConfigurationResponseDto } from './get-branch-delivery-configuration.response.dto';

@Controller('delivery/branches')
export class GetBranchDeliveryConfigurationHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':branchId/configuration')
  async getConfiguration(
    @Param() params: GetBranchDeliveryConfigurationParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetBranchDeliveryConfigurationResponseDto> {
    const result = await this.queryBus.execute<
      GetBranchDeliveryConfigurationQuery,
      GetBranchDeliveryConfigurationResult
    >(new GetBranchDeliveryConfigurationQuery(user.tenantId, params.branchId));

    if (result.isErr()) throw toGetBranchDeliveryConfigurationProblem(result.error);

    return result.value;
  }
}

function toGetBranchDeliveryConfigurationProblem(error: GetBranchDeliveryConfigurationError): ProblemException {
  const problem = getBranchDeliveryConfigurationProblemMap[error.code];

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

const getBranchDeliveryConfigurationProblemMap = {
  'delivery.branch_not_found': {
    type: createProblemType('delivery/branch-not-found'),
    title: 'Branch not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested branch was not found.',
  },
} satisfies Record<
  GetBranchDeliveryConfigurationErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
