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
  DuplicateOrderItemAccessoryAssetError,
  OrderAccessorySelectionNotAllowedError,
  OrderAccessorySelectionRequiresProductItemError,
  OrderItemAccessoryAssetLocationMismatchError,
  OrderItemAccessoryAssetMismatchError,
  OrderItemAccessoryAssetUnavailableError,
  OrderItemAccessoryAssignmentNotFoundError,
  OrderItemAccessoryAssignmentQuantityExceededError,
} from 'src/modules/order/domain/errors/order.errors';

import { AssignOrderItemAccessoryAssetsCommand } from './assign-order-item-accessory-assets.command';
import {
  AssignOrderItemAccessoryAssetsParamDto,
  AssignOrderItemAccessoryAssetsRequestDto,
} from './assign-order-item-accessory-assets.request.dto';

@StaffRoute(Permission.CREATE_ORDERS)
@Controller('orders/:orderId/items/:orderItemId/accessories/:orderItemAccessoryId/assets')
export class AssignOrderItemAccessoryAssetsHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  async assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: AssignOrderItemAccessoryAssetsParamDto,
    @Body() dto: AssignOrderItemAccessoryAssetsRequestDto,
  ): Promise<void> {
    const result = await this.commandBus.execute(
      new AssignOrderItemAccessoryAssetsCommand(
        user.tenantId,
        params.orderId,
        params.orderItemId,
        params.orderItemAccessoryId,
        dto.quantity ?? null,
        dto.assetIds ?? [],
      ),
    );

    if (result.isErr()) {
      const error = result.error;

      if (error instanceof OrderItemAccessoryAssignmentNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (
        error instanceof OrderAccessorySelectionNotAllowedError ||
        error instanceof OrderAccessorySelectionRequiresProductItemError ||
        error instanceof DuplicateOrderItemAccessoryAssetError ||
        error instanceof OrderItemAccessoryAssignmentQuantityExceededError ||
        error instanceof OrderItemAccessoryAssetMismatchError ||
        error instanceof OrderItemAccessoryAssetLocationMismatchError ||
        error instanceof OrderItemAccessoryAssetUnavailableError
      ) {
        throw new UnprocessableEntityException(error.message);
      }

      throw error;
    }
  }
}
