import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus } from '@repo/types';
import { err, ok, Result } from 'neverthrow';
import { PrismaService } from 'src/core/database/prisma.service';
import { OrderRejectedEvent } from 'src/modules/order/public/events/order-rejected.event';

import { OrderRepository } from 'src/modules/order/infrastructure/persistence/repositories/order.repository';
import { RejectOrderCommand } from './reject-order.command';
import { InvalidOrderStatusTransitionException } from '../../../domain/exceptions/order.exceptions';
import { OrderNotFoundError, OrderStatusTransitionNotAllowedError } from '../../../domain/errors/order.errors';

type RejectOrderError = OrderNotFoundError | OrderStatusTransitionNotAllowedError;

@CommandHandler(RejectOrderCommand)
export class RejectOrderService implements ICommandHandler<RejectOrderCommand, Result<void, RejectOrderError>> {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(command: RejectOrderCommand): Promise<Result<void, RejectOrderError>> {
    const order = await this.orderRepository.load(command.orderId, command.tenantId);

    if (!order) {
      return err(new OrderNotFoundError(command.orderId));
    }

    try {
      order.reject(command.reviewedByUserId, command.rejectionReason);
    } catch (error) {
      if (error instanceof InvalidOrderStatusTransitionException) {
        return err(new OrderStatusTransitionNotAllowedError(order.currentStatus, OrderStatus.REJECTED));
      }

      throw error;
    }

    await this.prisma.client.$transaction(async (tx) => {
      await this.orderRepository.save(order, tx);
    });

    await this.eventEmitter.emitAsync(
      OrderRejectedEvent.EVENT_NAME,
      new OrderRejectedEvent({
        orderId: order.id,
        tenantId: order.tenantId,
        customerId: order.customerId,
        reviewedByUserId: command.reviewedByUserId,
        rejectionReason: command.rejectionReason,
      }),
    );

    return ok(undefined);
  }
}
