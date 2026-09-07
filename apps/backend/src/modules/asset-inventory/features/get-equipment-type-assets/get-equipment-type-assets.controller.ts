import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { GetEquipmentTypeAssetsError, GetEquipmentTypeAssetsErrorCode } from './get-equipment-type-assets.errors';
import { GetEquipmentTypeAssetsResult } from './get-equipment-type-assets.handler';
import { GetEquipmentTypeAssetsQuery } from './get-equipment-type-assets.query';
import {
  GetEquipmentTypeAssetsParamsDto,
  GetEquipmentTypeAssetsRequestDto,
} from './get-equipment-type-assets.request.dto';
import type { GetEquipmentTypeAssetsResponseDto } from './get-equipment-type-assets.response.dto';

@Controller('asset-inventory/equipment-types')
export class GetEquipmentTypeAssetsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':equipmentTypeId/assets')
  async getEquipmentTypeAssets(
    @Param() params: GetEquipmentTypeAssetsParamsDto,
    @Query() request: GetEquipmentTypeAssetsRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetEquipmentTypeAssetsResponseDto> {
    const result = await this.queryBus.execute<GetEquipmentTypeAssetsQuery, GetEquipmentTypeAssetsResult>(
      new GetEquipmentTypeAssetsQuery(
        user.tenantId,
        params.equipmentTypeId,
        request.search,
        request.status,
        request.branchId,
        request.ownerId,
        request.page,
        request.pageSize,
      ),
    );

    if (result.isErr()) {
      throw toGetEquipmentTypeAssetsProblem(result.error);
    }

    return {
      data: result.value.data.map((asset) => ({
        id: asset.id,
        serialNumber: asset.serialNumber,
        notes: asset.notes,
        status: asset.status,
        branchId: asset.branchId,
        branchName: asset.branchName,
        ownerId: asset.ownerId,
        ownerName: asset.ownerName,
        updatedAt: asset.updatedAt,
      })),
      total: result.value.total,
      page: result.value.page,
      pageSize: result.value.pageSize,
    };
  }
}

function toGetEquipmentTypeAssetsProblem(error: GetEquipmentTypeAssetsError): ProblemException {
  const problem = getEquipmentTypeAssetsProblemMap[error.code];

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

const getEquipmentTypeAssetsProblemMap = {
  'asset_inventory.equipment_type_not_found': {
    type: createProblemType('asset_inventory.equipment_type_not_found'),
    title: 'Equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested equipment type could not be found.',
  },
} satisfies Record<
  GetEquipmentTypeAssetsErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
