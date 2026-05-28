import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderStatus } from '@repo/types';
import { err, ok, Result } from 'neverthrow';

import { OrderRepository } from 'src/modules/order/infrastructure/persistence/repositories/order.repository';
import { MarkEquipmentAsRetiredCommand } from './mark-equipment-as-retired.command';
import { InvalidOrderStatusTransitionException } from '../../../domain/exceptions/order.exceptions';
import { OrderNotFoundError, OrderStatusTransitionNotAllowedError } from '../../../domain/errors/order.errors';

type MarkEquipmentAsRetiredError = OrderNotFoundError | OrderStatusTransitionNotAllowedError;

@CommandHandler(MarkEquipmentAsRetiredCommand)
export class MarkEquipmentAsRetiredService implements ICommandHandler<
  MarkEquipmentAsRetiredCommand,
  Result<void, MarkEquipmentAsRetiredError>
> {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(command: MarkEquipmentAsRetiredCommand): Promise<Result<void, MarkEquipmentAsRetiredError>> {
    const order = await this.orderRepository.load(command.orderId, command.tenantId);

    if (!order) {
      return err(new OrderNotFoundError(command.orderId));
    }

    try {
      order.activate();
    } catch (error) {
      if (error instanceof InvalidOrderStatusTransitionException) {
        return err(new OrderStatusTransitionNotAllowedError(order.currentStatus, OrderStatus.ACTIVE));
      }

      throw error;
    }

    await this.orderRepository.save(order);
    return ok(undefined);
  }
}
