import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { GetOwnerDetailError, GetOwnerDetailErrorCode } from './get-owner-detail.errors';
import { GetOwnerDetailResult } from './get-owner-detail.handler';
import { GetOwnerDetailQuery } from './get-owner-detail.query';
import { GetOwnerDetailParamsDto } from './get-owner-detail.request.dto';
import type { GetOwnerDetailResponseDto } from './get-owner-detail.response.dto';

@Controller('asset-inventory/owners')
export class GetOwnerDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':ownerId')
  async getOwnerDetail(
    @Param() params: GetOwnerDetailParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetOwnerDetailResponseDto> {
    const result = await this.queryBus.execute<GetOwnerDetailQuery, GetOwnerDetailResult>(
      new GetOwnerDetailQuery(user.tenantId, params.ownerId),
    );

    if (result.isErr()) {
      throw toGetOwnerDetailProblem(result.error);
    }

    return result.value;
  }
}

function toGetOwnerDetailProblem(error: GetOwnerDetailError): ProblemException {
  const problem = getOwnerDetailProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: {
        code: error.code,
        ownerId: error.context?.ownerId,
      },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const getOwnerDetailProblemMap = {
  'asset_inventory.owner_not_found': {
    type: createProblemType('asset_inventory.owner_not_found'),
    title: 'Owner not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested owner could not be found.',
  },
} satisfies Record<GetOwnerDetailErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
