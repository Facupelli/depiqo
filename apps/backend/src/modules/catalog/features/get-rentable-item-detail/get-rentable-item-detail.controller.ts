import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { GetRentableItemDetailError, GetRentableItemDetailErrorCode } from './get-rentable-item-detail.errors';
import type { GetRentableItemDetailReadModel } from './get-rentable-item-detail.handler';
import { GetRentableItemDetailQuery } from './get-rentable-item-detail.query';
import { GetRentableItemDetailRequestDto } from './get-rentable-item-detail.request.dto';
import type { GetRentableItemDetailResponseDto } from './get-rentable-item-detail.response.dto';

@Controller('catalog/rentable-items')
export class GetRentableItemDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':rentableItemId')
  async getRentableItemDetail(
    @Param() params: GetRentableItemDetailRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentableItemDetailResponseDto> {
    const result = await this.queryBus.execute<
      GetRentableItemDetailQuery,
      Result<GetRentableItemDetailReadModel, GetRentableItemDetailError>
    >(new GetRentableItemDetailQuery(user.tenantId, params.rentableItemId));

    if (result.isErr()) {
      throw toGetRentableItemDetailProblem(result.error);
    }

    return result.value;
  }
}

function toGetRentableItemDetailProblem(error: GetRentableItemDetailError): ProblemException {
  const problem = getRentableItemDetailProblemMap[error.code];

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

const getRentableItemDetailProblemMap = {
  'catalog.rentable_item_not_found': {
    type: createProblemType('catalog.rentable_item_not_found'),
    title: 'Rentable item not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rentable item could not be found.',
  },
} satisfies Record<GetRentableItemDetailErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
