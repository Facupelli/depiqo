import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderStatus } from '@repo/types';
import { err, ok, Result } from 'neverthrow';

import { OrderRepository } from 'src/modules/order/infrastructure/persistence/repositories/order.repository';
import { MarkEquipmentAsReturnedCommand } from './mark-equipment-as-returned.command';
import { InvalidOrderStatusTransitionException } from '../../../domain/exceptions/order.exceptions';
import { OrderNotFoundError, OrderStatusTransitionNotAllowedError } from '../../../domain/errors/order.errors';

type MarkEquipmentAsReturnedError = OrderNotFoundError | OrderStatusTransitionNotAllowedError;

@CommandHandler(MarkEquipmentAsReturnedCommand)
export class MarkEquipmentAsReturnedService implements ICommandHandler<
  MarkEquipmentAsReturnedCommand,
  Result<void, MarkEquipmentAsReturnedError>
> {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(command: MarkEquipmentAsReturnedCommand): Promise<Result<void, MarkEquipmentAsReturnedError>> {
    const order = await this.orderRepository.load(command.orderId, command.tenantId);

    if (!order) {
      return err(new OrderNotFoundError(command.orderId));
    }

    try {
      order.complete();
    } catch (error) {
      if (error instanceof InvalidOrderStatusTransitionException) {
        return err(new OrderStatusTransitionNotAllowedError(order.currentStatus, OrderStatus.COMPLETED));
      }

      throw error;
    }

    await this.orderRepository.save(order);
    return ok(undefined);
  }
}
