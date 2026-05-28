import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';

import { AddAssetsToEquipmentTypeCommand } from './add-assets-to-equipment-type.command';
import { toAddAssetsToEquipmentTypeProblem } from './add-assets-to-equipment-type-http-error.mapper';
import { AddAssetsToEquipmentTypeServiceResult } from './add-assets-to-equipment-type.handler';
import {
  AddAssetsToEquipmentTypeParamsDto,
  AddAssetsToEquipmentTypeRequestDto,
} from './add-assets-to-equipment-type.request.dto';
import { AddAssetsToEquipmentTypeResponseDto } from './add-assets-to-equipment-type.response.dto';

@Controller('v2/asset-inventory/equipment-types/:equipmentTypeId/assets')
export class AddAssetsToEquipmentTypeHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param() params: AddAssetsToEquipmentTypeParamsDto,
    @Body() dto: AddAssetsToEquipmentTypeRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AddAssetsToEquipmentTypeResponseDto> {
    const result = await this.commandBus.execute<
      AddAssetsToEquipmentTypeCommand,
      AddAssetsToEquipmentTypeServiceResult
    >(
      new AddAssetsToEquipmentTypeCommand({
        tenantId: user.tenantId,
        equipmentTypeId: params.equipmentTypeId,
        assets: dto.assets,
      }),
    );

    if (result.isErr()) {
      throw toAddAssetsToEquipmentTypeProblem(result.error);
    }

    return { assetIds: result.value.assetIds };
  }
}
