import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { GetBranchDetailError, GetBranchDetailErrorCode } from './get-branch-detail.errors';
import { GetBranchDetailResult } from './get-branch-detail.handler';
import { GetBranchDetailQuery } from './get-branch-detail.query';
import { GetBranchDetailParamsDto } from './get-branch-detail.request.dto';
import { GetBranchDetailResponseDto } from './get-branch-detail.response.dto';

@Controller('tenant-management/branches')
export class GetBranchDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':branchId')
  async getBranchDetail(
    @Param() params: GetBranchDetailParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetBranchDetailResponseDto> {
    const result = await this.queryBus.execute<GetBranchDetailQuery, GetBranchDetailResult>(
      new GetBranchDetailQuery(user.tenantId, params.branchId),
    );

    if (result.isErr()) {
      throw toGetBranchDetailProblem(result.error);
    }

    return result.value;
  }
}

function toGetBranchDetailProblem(error: GetBranchDetailError): ProblemException {
  const problem = getBranchDetailProblemMap[error.code];

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

const getBranchDetailProblemMap = {
  'tenant_management.branch_not_found': {
    type: createProblemType('tenant-management/branch-not-found'),
    title: 'Branch not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested branch was not found.',
  },
} satisfies Record<GetBranchDetailErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
