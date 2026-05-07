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
  DuplicateOrderItemAccessoryError,
  InvalidOrderItemAccessoryQuantityError,
  OrderAccessorySelectionItemNotFoundError,
  OrderAccessorySelectionNotAllowedError,
  OrderAccessorySelectionRequiresProductItemError,
  OrderItemAccessoryIncompatibleError,
  OrderItemAccessoryMustBeAccessoryError,
  OrderItemAccessoryRentalItemNotFoundError,
  OrderNotFoundError,
} from 'src/modules/order/domain/errors/order.errors';

import { ReplaceOrderItemAccessoriesCommand } from './replace-order-item-accessories.command';
import {
  ReplaceOrderItemAccessoriesParamDto,
  ReplaceOrderItemAccessoriesRequestDto,
} from './replace-order-item-accessories.request.dto';

@StaffRoute(Permission.CREATE_ORDERS)
@Controller('orders/:orderId/items/:orderItemId/accessories')
export class ReplaceOrderItemAccessoriesHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  async replace(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ReplaceOrderItemAccessoriesParamDto,
    @Body() dto: ReplaceOrderItemAccessoriesRequestDto,
  ): Promise<void> {
    const result = await this.commandBus.execute(
      new ReplaceOrderItemAccessoriesCommand(
        user.tenantId,
        params.orderId,
        params.orderItemId,
        dto.accessories.map((accessory) => ({
          accessoryRentalItemId: accessory.accessoryRentalItemId,
          quantity: accessory.quantity,
          notes: accessory.notes ?? null,
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
        error instanceof OrderItemAccessoryRentalItemNotFoundError ||
        error instanceof OrderItemAccessoryMustBeAccessoryError ||
        error instanceof OrderItemAccessoryIncompatibleError
      ) {
        throw new UnprocessableEntityException(error.message);
      }

      throw error;
    }
  }
}
