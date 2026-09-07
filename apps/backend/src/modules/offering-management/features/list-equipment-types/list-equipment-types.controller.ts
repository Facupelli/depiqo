import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { ListEquipmentTypesError, ListEquipmentTypesErrorCode } from './list-equipment-types.errors';
import { ListEquipmentTypesResult } from './list-equipment-types.handler';
import { ListEquipmentTypesQuery } from './list-equipment-types.query';
import { ListEquipmentTypesRequestDto } from './list-equipment-types.request.dto';
import type { ListEquipmentTypesResponseDto } from './list-equipment-types.response.dto';

@Controller('backoffice/equipment-types')
export class ListEquipmentTypesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async list(
    @Query() dto: ListEquipmentTypesRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ListEquipmentTypesResponseDto> {
    const result = await this.queryBus.execute<ListEquipmentTypesQuery, ListEquipmentTypesResult>(
      new ListEquipmentTypesQuery(user.tenantId, dto.search, dto.categoryId, dto.branchId, dto.page, dto.pageSize),
    );

    if (result.isErr()) throw toListEquipmentTypesProblem(result.error);
    return result.value;
  }
}

function toListEquipmentTypesProblem(error: ListEquipmentTypesError): ProblemException {
  const problem = listEquipmentTypesProblemMap[error.code];

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

const listEquipmentTypesProblemMap = {
  'offering_management.equipment_types.branch_not_found': {
    type: createProblemType('offering_management.equipment_types.branch_not_found'),
    title: 'Branch not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The selected branch was not found.',
  },
} satisfies Record<ListEquipmentTypesErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
