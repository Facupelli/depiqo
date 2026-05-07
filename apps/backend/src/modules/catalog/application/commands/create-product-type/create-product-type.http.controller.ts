import { StaffRoute } from 'src/core/decorators/staff-route.decorator';
import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { Permission, RentalItemKind } from '@repo/types';
import { CommandBus } from '@nestjs/cqrs';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import { CreateProductTypeCommand } from './create-product-type.command';
import { CreateProductTypeRequestDto } from './create-product-type.request.dto';
import { CreateProductTypeResponseDto } from './create-product-type.response.dto';
import { InvalidProductTypeNameError } from '../../../domain/errors/catalog.errors';

@StaffRoute(Permission.CREATE_PRODUCTS)
@Controller('product-types')
export class CreateProductTypeHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductTypeRequestDto,
  ): Promise<CreateProductTypeResponseDto> {
    const result = await this.commandBus.execute(
      new CreateProductTypeCommand(user.tenantId, {
        categoryId: dto.categoryId ?? null,
        billingUnitId: dto.billingUnitId,
        name: dto.name,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? '',
        kind: dto.kind ?? RentalItemKind.PRIMARY,
        trackingMode: dto.trackingMode,
        excludeFromNewArrivals: dto.excludeFromNewArrivals,
        attributes: dto.attributes ?? null,
        includedItems:
          dto.includedItems?.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            notes: item.notes ?? null,
          })) ?? null,
      }),
    );

    if (result.isErr()) {
      if (result.error instanceof InvalidProductTypeNameError) {
        throw new BadRequestException(result.error.message);
      }

      throw result.error;
    }

    return result.value;
  }
}
