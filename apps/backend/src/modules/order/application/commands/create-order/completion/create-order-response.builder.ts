import { QueryBus } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { CreateOrderResponseDto } from '../create-order.response.dto';
import { loadCreateOrderCompletionContext } from './create-order-completion-context.loader';
import { buildCreateOrderNextStep } from './create-order-next-step.builder';
import { CreateOrderCompletionContext } from './create-order-next-step.types';

export function buildCreateOrderResponse(params: {
  orderId: string;
  status: CreateOrderResponseDto['status'];
  completionContext: CreateOrderCompletionContext;
}): CreateOrderResponseDto {
  return {
    orderId: params.orderId,
    status: params.status,
    nextStep: buildCreateOrderNextStep(params.completionContext),
  };
}

export async function buildCreateOrderResponseForPersistedOrder(
  prisma: PrismaService,
  queryBus: QueryBus,
  tenantId: string,
  orderId: string,
): Promise<CreateOrderResponseDto> {
  const order = await prisma.client.order.findFirst({
    where: { id: orderId, tenantId },
    select: { id: true, status: true },
  });

  if (!order) {
    throw new Error(`Persisted order "${orderId}" not found.`);
  }

  const completionContext = await loadCreateOrderCompletionContext(prisma, queryBus, tenantId, orderId);

  return buildCreateOrderResponse({
    orderId: order.id,
    status: order.status as CreateOrderResponseDto['status'],
    completionContext,
  });
}
