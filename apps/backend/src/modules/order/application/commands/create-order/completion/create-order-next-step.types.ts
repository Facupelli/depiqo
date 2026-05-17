import { FulfillmentMethod, OrderCommunicationMode } from '@repo/types';

export type CreateOrderCompletionContext = {
  communication: {
    orderCommunicationMode: OrderCommunicationMode;
    whatsAppNumber?: string;
  };
  order: {
    id: string;
    orderNumber: number;
  };
  customer: {
    fullName: string;
  };
  booking: {
    pickupDate: string;
    pickupTime: number;
    returnDate: string;
    returnTime: number;
    timezone: string;
  };
  fulfillment: {
    method: FulfillmentMethod;
    locationName: string | null;
    deliveryRequest:
      | {
          recipientName: string;
          addressLine1: string;
          addressLine2: string | null;
          city: string;
          stateRegion: string;
          postalCode: string;
          country: string;
          instructions: string | null;
        }
      | null;
  };
  items: Array<{
    name: string;
    quantity: number;
  }>;
  pricing: {
    currency: string;
    totalAmount: number;
  };
};
