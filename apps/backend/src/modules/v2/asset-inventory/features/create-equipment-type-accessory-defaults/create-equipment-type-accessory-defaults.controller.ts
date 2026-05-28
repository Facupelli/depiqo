import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';

import { CreateEquipmentTypeAccessoryDefaultsCommand } from './create-equipment-type-accessory-defaults.command';
import { toCreateEquipmentTypeAccessoryDefaultsProblem } from './create-equipment-type-accessory-defaults-http-error.mapper';
import { CreateEquipmentTypeAccessoryDefaultsServiceResult } from './create-equipment-type-accessory-defaults.handler';
import {
  CreateEquipmentTypeAccessoryDefaultsParamsDto,
  CreateEquipmentTypeAccessoryDefaultsRequestDto,
} from './create-equipment-type-accessory-defaults.request.dto';

@Controller('v2/asset-inventory/equipment-types/:equipmentTypeId/accessory-defaults')
export class CreateEquipmentTypeAccessoryDefaultsHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param() params: CreateEquipmentTypeAccessoryDefaultsParamsDto,
    @Body() dto: CreateEquipmentTypeAccessoryDefaultsRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<
      CreateEquipmentTypeAccessoryDefaultsCommand,
      CreateEquipmentTypeAccessoryDefaultsServiceResult
    >(
      new CreateEquipmentTypeAccessoryDefaultsCommand({
        tenantId: user.tenantId,
        equipmentTypeId: params.equipmentTypeId,
        accessories: dto.accessories,
      }),
    );

    if (result.isErr()) {
      throw toCreateEquipmentTypeAccessoryDefaultsProblem(result.error);
    }
  }
}
