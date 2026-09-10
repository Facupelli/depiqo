import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { GetEquipmentTypeSummaryError, GetEquipmentTypeSummaryErrorCode } from './get-equipment-type-summary.errors';
import { GetEquipmentTypeSummaryResult } from './get-equipment-type-summary.handler';
import { GetEquipmentTypeSummaryQuery } from './get-equipment-type-summary.query';
import { GetEquipmentTypeSummaryParamsDto } from './get-equipment-type-summary.request.dto';
import type { GetEquipmentTypeSummaryResponseDto } from './get-equipment-type-summary.response.dto';

@Controller('asset-inventory/equipment-types')
export class GetEquipmentTypeSummaryHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':equipmentTypeId/summary')
  async getEquipmentTypeSummary(
    @Param() params: GetEquipmentTypeSummaryParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetEquipmentTypeSummaryResponseDto> {
    const result = await this.queryBus.execute<GetEquipmentTypeSummaryQuery, GetEquipmentTypeSummaryResult>(
      new GetEquipmentTypeSummaryQuery(user.tenantId, params.equipmentTypeId),
    );

    if (result.isErr()) {
      throw toGetEquipmentTypeSummaryProblem(result.error);
    }

    return {
      id: result.value.id,
      name: result.value.name,
      description: result.value.description,
      imageUrl: result.value.imageUrl,
      categoryId: result.value.categoryId,
      categoryName: result.value.categoryName,
      activeAssetCount: result.value.activeAssetCount,
    };
  }
}

function toGetEquipmentTypeSummaryProblem(error: GetEquipmentTypeSummaryError): ProblemException {
  const problem = getEquipmentTypeSummaryProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: {
        code: error.code,
        equipmentTypeId: error.context?.equipmentTypeId,
      },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const getEquipmentTypeSummaryProblemMap = {
  'asset_inventory.equipment_type_not_found': {
    type: createProblemType('asset_inventory.equipment_type_not_found'),
    title: 'Equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested equipment type could not be found.',
  },
} satisfies Record<
  GetEquipmentTypeSummaryErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
