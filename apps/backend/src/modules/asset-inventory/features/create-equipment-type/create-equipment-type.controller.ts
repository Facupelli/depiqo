import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { CreateEquipmentTypeCommand } from './create-equipment-type.command';
import { CreateEquipmentTypeServiceResult } from './create-equipment-type.handler';
import { toCreateEquipmentTypeProblem } from './create-equipment-type.http-errors';
import { CreateEquipmentTypeRequestDto } from './create-equipment-type.request.dto';
import { CreateEquipmentTypeResponseDto } from './create-equipment-type.response.dto';

@Controller('asset-inventory/equipment-types')
export class CreateEquipmentTypeHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateEquipmentTypeRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateEquipmentTypeResponseDto> {
    const result = await this.commandBus.execute<CreateEquipmentTypeCommand, CreateEquipmentTypeServiceResult>(
      new CreateEquipmentTypeCommand({
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description,
        assets: dto.assets,
      }),
    );

    if (result.isErr()) {
      throw toCreateEquipmentTypeProblem(result.error);
    }

    return {
      equipmentTypeId: result.value.equipmentTypeId,
      assetIds: result.value.assetIds,
    };
  }
}
