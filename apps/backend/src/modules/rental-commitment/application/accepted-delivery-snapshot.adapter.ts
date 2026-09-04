import type { DeliveryQuote } from '../../delivery/public-api/delivery-quote.public-api';
import {
  ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA,
  ACCEPTED_DELIVERY_SNAPSHOT_VERSION,
  AcceptedDeliverySnapshotData,
} from '../domain/value-objects/accepted-delivery-snapshot.value-object';

export function acceptedDeliverySnapshotFromQuote(quote: DeliveryQuote): AcceptedDeliverySnapshotData {
  return {
    schema: ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA,
    version: ACCEPTED_DELIVERY_SNAPSHOT_VERSION,
    resolvedCustomerLocation: { ...quote.resolvedCustomerLocation },
    distanceMeters: quote.distanceMeters,
    delivery: {
      scheduledAt: quote.delivery.scheduledAt.toISOString(),
      serviceLevel: quote.delivery.serviceLevel,
      basePrice: quote.delivery.basePrice,
      surcharge: quote.delivery.surcharge,
      total: quote.delivery.total,
    },
    collection: {
      scheduledAt: quote.collection.scheduledAt.toISOString(),
      serviceLevel: quote.collection.serviceLevel,
      basePrice: quote.collection.basePrice,
      surcharge: quote.collection.surcharge,
      total: quote.collection.total,
    },
    currency: quote.currency,
    deliveryTotal: quote.deliveryTotal,
    transportReservationMinutes: quote.transportReservationMinutes,
  };
}
