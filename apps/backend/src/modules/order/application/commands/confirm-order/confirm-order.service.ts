import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderStatus } from '@repo/types';
import { err, Result } from 'neverthrow';

import { OrderRepository } from 'src/modules/order/infrastructure/persistence/repositories/order.repository';

import { ConfirmOrderCommand } from './confirm-order.command';
import { ConfirmDraftOrderFlow } from './confirm-draft-order.flow';
import { ConfirmPendingReviewOrderFlow } from './confirm-pending-review-order.flow';
import {
  NoActiveContractForAssetError,
  OrderCustomerRequiredForConfirmationError,
  OrderItemUnavailableError,
  OrderNotFoundError,
  OrderStatusTransitionNotAllowedError,
} from '../../../domain/errors/order.errors';

type ConfirmOrderError =
  | NoActiveContractForAssetError
  | OrderCustomerRequiredForConfirmationError
  | OrderItemUnavailableError
  | OrderNotFoundError
  | OrderStatusTransitionNotAllowedError;

@Injectable()
@CommandHandler(ConfirmOrderCommand)
export class ConfirmOrderService implements ICommandHandler<ConfirmOrderCommand, Result<void, ConfirmOrderError>> {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly confirmPendingReviewOrderFlow: ConfirmPendingReviewOrderFlow,
    private readonly confirmDraftOrderFlow: ConfirmDraftOrderFlow,
  ) {}

  async execute(command: ConfirmOrderCommand): Promise<Result<void, ConfirmOrderError>> {
    const order = await this.orderRepository.load(command.orderId, command.tenantId);

    if (!order) {
      return err(new OrderNotFoundError(command.orderId));
    }

    if (order.currentStatus === OrderStatus.DRAFT) {
      return this.confirmDraftOrderFlow.execute(order);
    }

    return this.confirmPendingReviewOrderFlow.execute(order, command.reviewedByUserId);
  }
}
