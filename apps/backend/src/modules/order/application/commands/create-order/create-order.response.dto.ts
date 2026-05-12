import { OrderStatus } from '@repo/types';

export type CreateOrderResponseDto = {
  orderId: string;
  status: OrderStatus;
};
