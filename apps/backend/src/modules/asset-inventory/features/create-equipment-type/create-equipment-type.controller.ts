import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';
import { TenantAuthorizationHttpEnforcer } from 'src/modules/tenant-management/authorization/tenant-authorization-http.enforcer';

import { CreateEquipmentTypeCommand } from './create-equipment-type.command';
import { CreateEquipmentTypeServiceResult } from './create-equipment-type.handler';
import { toCreateEquipmentTypeProblem } from './create-equipment-type.http-errors';
import { CreateEquipmentTypeRequestDto } from './create-equipment-type.request.dto';
import { CreateEquipmentTypeResponseDto } from './create-equipment-type.response.dto';

@Controller('asset-inventory/equipment-types')
export class CreateEquipmentTypeHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly authorizationEnforcer: TenantAuthorizationHttpEnforcer,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(TenantPermission.InventoryManage)
  async create(
    @Body() dto: CreateEquipmentTypeRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateEquipmentTypeResponseDto> {
    if (dto.assets.some((asset) => asset.ownerId !== undefined && asset.ownerId !== null)) {
      await this.authorizationEnforcer.requirePermission(user, TenantPermission.InventoryOwnershipManage);
    }

    const result = await this.commandBus.execute<CreateEquipmentTypeCommand, CreateEquipmentTypeServiceResult>(
      new CreateEquipmentTypeCommand({
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
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
