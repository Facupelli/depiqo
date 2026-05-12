import { StaffRoute } from 'src/core/decorators/staff-route.decorator';
import { Controller, HttpCode, HttpStatus, NotFoundException, Param, Post } from '@nestjs/common';
import { Permission } from '@repo/types';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { ProblemException } from 'src/core/exceptions/problem.exception';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';

import { ConfirmOrderCommand } from './confirm-order.command';
import { ConfirmOrderRequestDto } from './confirm-order.request.dto';
import {
  OrderCustomerRequiredForConfirmationError,
  OrderItemUnavailableError,
  OrderNotFoundError,
  OrderStatusTransitionNotAllowedError,
} from '../../../domain/errors/order.errors';

@StaffRoute(Permission.CONFIRM_ORDERS)
@Controller('orders/:orderId/confirm')
export class ConfirmOrderHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirm(@CurrentUser() user: AuthenticatedUser, @Param() dto: ConfirmOrderRequestDto): Promise<void> {
    const result = await this.commandBus.execute(new ConfirmOrderCommand(user.tenantId, dto.orderId, user.id));

    if (result.isErr()) {
      const error = result.error;

      if (error instanceof OrderNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof OrderStatusTransitionNotAllowedError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Invalid Order Transition',
          error.message,
          'errors://invalid-order-transition',
        );
      }

      if (error instanceof OrderCustomerRequiredForConfirmationError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Customer Required',
          error.message,
          'errors://order-customer-required',
        );
      }

      if (error instanceof OrderItemUnavailableError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Order Items Unavailable',
          error.message,
          'errors://order-items-unavailable',
          {
            unavailableItems: error.unavailableItems,
            conflictGroups: error.conflictGroups,
            accessoryConflicts: error.accessoryConflicts,
          },
        );
      }

      throw error;
    }
  }
}
