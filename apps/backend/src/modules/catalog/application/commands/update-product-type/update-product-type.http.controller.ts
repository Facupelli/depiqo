import {
  BadRequestException,
  ConflictException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Permission } from '@repo/types';

import { StaffRoute } from 'src/core/decorators/staff-route.decorator';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import {
  AccessoryProductTypeCannotBePublishedError,
  InvalidProductTypeNameError,
  ProductTypeAlreadyRetiredError,
  ProductTypeNotFoundError,
} from 'src/modules/catalog/domain/errors/catalog.errors';

import { UpdateProductTypeCommand } from './update-product-type.command';
import { UpdateProductTypeRequestDto } from './update-product-type.request.dto';

@StaffRoute(Permission.UPDATE_PRODUCTS)
@Controller('product-types')
export class UpdateProductTypeHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductTypeRequestDto,
  ): Promise<void> {
    const patch = {
      categoryId: dto.categoryId,
      billingUnitId: dto.billingUnitId,
      name: dto.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      kind: dto.kind,
      trackingMode: dto.trackingMode,
      excludeFromNewArrivals: dto.excludeFromNewArrivals,
      attributes: dto.attributes,
      includedItems:
        dto.includedItems?.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          notes: item.notes ?? null,
        })) ?? undefined,
    };

    const result = await this.commandBus.execute(new UpdateProductTypeCommand(user.tenantId, id, patch));

    if (result.isErr()) {
      const error = result.error;

      if (error instanceof ProductTypeNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof InvalidProductTypeNameError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof ProductTypeAlreadyRetiredError) {
        throw new ConflictException(error.message);
      }

      if (error instanceof AccessoryProductTypeCannotBePublishedError) {
        throw new UnprocessableEntityException(error.message);
      }

      throw error;
    }
  }
}
