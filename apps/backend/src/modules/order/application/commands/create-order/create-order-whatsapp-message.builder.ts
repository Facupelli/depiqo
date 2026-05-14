import { FulfillmentMethod } from '@repo/types';

import { CreateOrderCompletionContext } from './create-order-next-step.types';

export function buildCreateOrderWhatsAppMessage(context: CreateOrderCompletionContext): string {
  const lines: string[] = [
    'Hola, quiero continuar con este pedido:',
    '',
    `Pedido N° ${context.order.orderNumber}`,
    `Nombre: ${context.customer.fullName}`,
    '',
    `Retiro: ${formatLocalDate(context.booking.pickupDate)} ${formatTime(context.booking.pickupTime)}`,
    `Devolución: ${formatLocalDate(context.booking.returnDate)} ${formatTime(context.booking.returnTime)}`,
    '',
    ...buildFulfillmentLines(context),
    '',
    'Items:',
    ...context.items.map((item) => `- ${item.quantity} x ${item.name}`),
    '',
    `Total: ${formatCurrency(context.pricing.totalAmount, context.pricing.currency)}`,
    '',
    'Espero tu respuesta para confirmar mi pedido'
  ];

  return lines.join('\n');
}

function buildFulfillmentLines(context: CreateOrderCompletionContext): string[] {
  if (context.fulfillment.method === FulfillmentMethod.DELIVERY && context.fulfillment.deliveryRequest) {
    const { deliveryRequest } = context.fulfillment;
    const lines = [
      'Modalidad: entrega a domicilio',
      `Destinatario: ${deliveryRequest.recipientName}`,
      `Dirección: ${formatDeliveryAddress(deliveryRequest)}`,
    ];

    if (deliveryRequest.instructions) {
      lines.push(`Instrucciones: ${deliveryRequest.instructions}`);
    }

    return lines;
  }

  const lines = ['Modalidad: retiro en sucursal'];

  if (context.fulfillment.locationName) {
    lines.push(`Sucursal: ${context.fulfillment.locationName}`);
  }

  return lines;
}

function formatDeliveryAddress(deliveryRequest: NonNullable<CreateOrderCompletionContext['fulfillment']['deliveryRequest']>): string {
  return [
    deliveryRequest.addressLine1,
    deliveryRequest.addressLine2,
    deliveryRequest.city,
    deliveryRequest.stateRegion,
    deliveryRequest.postalCode,
    deliveryRequest.country,
  ]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(', ');
}

function formatLocalDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatTime(minutesFromMidnight: number): string {
  const hours = Math.floor(minutesFromMidnight / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (minutesFromMidnight % 60).toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
