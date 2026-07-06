import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CreateRentableEquipmentCommand } from './create-rentable-equipment.command';
import { toCreateRentableEquipmentProblem } from './create-rentable-equipment-http-error.mapper';
import { CreateRentableEquipmentServiceResult } from './create-rentable-equipment.handler';
import { CreateRentableEquipmentRequestDto } from './create-rentable-equipment.request.dto';
import { CreateRentableEquipmentResponseDto } from './create-rentable-equipment.response.dto';

@Controller('v2/offering-setup/rentable-equipment')
export class CreateRentableEquipmentHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateRentableEquipmentRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateRentableEquipmentResponseDto> {
    const result = await this.commandBus.execute<CreateRentableEquipmentCommand, CreateRentableEquipmentServiceResult>(
      new CreateRentableEquipmentCommand({
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
        kind: dto.kind,
        quantityPerItem: dto.quantityPerItem,
        assets: dto.assets,
      }),
    );

    if (result.isErr()) {
      throw toCreateRentableEquipmentProblem(result.error);
    }

    return {
      equipmentTypeId: result.value.equipmentTypeId,
      assetIds: result.value.assetIds,
      rentableItemId: result.value.rentableItemId,
      rentalOfferIds: result.value.rentalOfferIds,
    };
  }
}
