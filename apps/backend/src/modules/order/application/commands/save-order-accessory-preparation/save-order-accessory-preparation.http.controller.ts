import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Put,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Permission } from '@repo/types';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { StaffRoute } from 'src/core/decorators/staff-route.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import {
  DuplicateOrderAccessoryPreparationItemError,
  DuplicateOrderItemAccessoryAssetError,
  DuplicateOrderItemAccessoryError,
  InvalidOrderItemAccessoryQuantityError,
  OrderAccessorySelectionItemNotFoundError,
  OrderAccessorySelectionNotAllowedError,
  OrderAccessorySelectionRequiresProductItemError,
  OrderItemAccessoryAssetLocationMismatchError,
  OrderItemAccessoryAssetMismatchError,
  OrderItemAccessoryAssetUnavailableError,
  OrderItemAccessoryAssignmentQuantityExceededError,
  OrderItemAccessoryIncompatibleError,
  OrderItemAccessoryInsufficientAvailableAssetsError,
  OrderItemAccessoryMustBeAccessoryError,
  OrderItemAccessoryRentalItemNotFoundError,
  OrderNotFoundError,
} from 'src/modules/order/domain/errors/order.errors';

import { SaveOrderAccessoryPreparationCommand } from './save-order-accessory-preparation.command';
import {
  SaveOrderAccessoryPreparationParamDto,
  SaveOrderAccessoryPreparationRequestDto,
} from './save-order-accessory-preparation.request.dto';

@StaffRoute(Permission.CREATE_ORDERS)
@Controller('orders/:orderId/accessory-preparation')
export class SaveOrderAccessoryPreparationHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: SaveOrderAccessoryPreparationParamDto,
    @Body() dto: SaveOrderAccessoryPreparationRequestDto,
  ): Promise<void> {
    const result = await this.commandBus.execute(
      new SaveOrderAccessoryPreparationCommand(
        user.tenantId,
        params.orderId,
        dto.items.map((item) => ({
          orderItemId: item.orderItemId,
          accessories: item.accessories.map((accessory) => ({
            accessoryRentalItemId: accessory.accessoryRentalItemId,
            quantity: accessory.quantity,
            notes: accessory.notes ?? null,
            assetIds: accessory.assetIds ?? null,
            autoAssignQuantity: accessory.autoAssignQuantity ?? null,
          })),
        })),
      ),
    );

    if (result.isErr()) {
      const error = result.error;

      if (error instanceof OrderNotFoundError || error instanceof OrderAccessorySelectionItemNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (
        error instanceof OrderAccessorySelectionNotAllowedError ||
        error instanceof OrderAccessorySelectionRequiresProductItemError ||
        error instanceof InvalidOrderItemAccessoryQuantityError ||
        error instanceof DuplicateOrderItemAccessoryError ||
        error instanceof DuplicateOrderAccessoryPreparationItemError ||
        error instanceof OrderItemAccessoryRentalItemNotFoundError ||
        error instanceof OrderItemAccessoryMustBeAccessoryError ||
        error instanceof OrderItemAccessoryIncompatibleError ||
        error instanceof DuplicateOrderItemAccessoryAssetError ||
        error instanceof OrderItemAccessoryAssignmentQuantityExceededError ||
        error instanceof OrderItemAccessoryAssetMismatchError ||
        error instanceof OrderItemAccessoryAssetLocationMismatchError ||
        error instanceof OrderItemAccessoryAssetUnavailableError ||
        error instanceof OrderItemAccessoryInsufficientAvailableAssetsError
      ) {
        throw new UnprocessableEntityException(error.message);
      }

      throw error;
    }
  }
}
