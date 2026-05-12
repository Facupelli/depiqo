import { StaffRoute } from 'src/core/decorators/staff-route.decorator';
import { Body, Controller, HttpCode, HttpStatus, NotFoundException, Param, Post } from '@nestjs/common';
import { Permission } from '@repo/types';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { ProblemException } from 'src/core/exceptions/problem.exception';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';

import { RejectOrderCommand } from './reject-order.command';
import { RejectOrderRequestDto } from './reject-order.request.dto';
import { OrderNotFoundError, OrderStatusTransitionNotAllowedError } from '../../../domain/errors/order.errors';

@StaffRoute(Permission.CONFIRM_ORDERS)
@Controller('orders/:orderId/reject')
export class RejectOrderHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body() body: Omit<RejectOrderRequestDto, 'orderId'>,
  ): Promise<void> {
    const result = await this.commandBus.execute(
      new RejectOrderCommand(user.tenantId, orderId, user.id, body.rejectionReason ?? null),
    );

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

      throw error;
    }
  }
}
