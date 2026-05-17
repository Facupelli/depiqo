import { CreateOrderNextStepType, OrderCommunicationMode } from '@repo/types';

import { CreateOrderResponseDto } from '../create-order.response.dto';
import { CreateOrderCompletionContext } from './create-order-next-step.types';
import { buildCreateOrderWhatsAppMessage } from './create-order-whatsapp-message.builder';

export function buildCreateOrderNextStep(context: CreateOrderCompletionContext): CreateOrderResponseDto['nextStep'] {
  if (context.communication.orderCommunicationMode === OrderCommunicationMode.WHATSAPP) {
    if (!context.communication.whatsAppNumber) {
      throw new Error('whatsAppNumber is required when orderCommunicationMode is WHATSAPP.');
    }

    const message = buildCreateOrderWhatsAppMessage(context);

    return {
      type: CreateOrderNextStepType.REDIRECT_TO_WHATSAPP,
      message,
      whatsappUrl: `https://wa.me/${context.communication.whatsAppNumber}?text=${encodeURIComponent(message)}`,
    };
  }

  return {
    type: CreateOrderNextStepType.SHOW_CONFIRMATION,
  };
}
