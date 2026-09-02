import type { DeliveryQuote } from '../domain/delivery-quote.types';

export type {
  DeliveryQuote,
  DeliveryQuoteLeg,
  DeliveryServiceLevel,
  ResolvedCustomerLocation,
} from '../domain/delivery-quote.types';

export interface CustomerLocationSelection {
  address: string;
}

export interface GetDeliveryQuoteInput {
  tenantId: string;
  branchId: string;
  customerLocation: CustomerLocationSelection;
  rentalStart: Date;
  rentalEnd: Date;
}

export type DeliveryQuoteNonServiceabilityReason =
  | 'NOT_CONFIGURED'
  | 'DISABLED'
  | 'BRANCH_UNAVAILABLE'
  | 'BRANCH_LOCATION_MISSING'
  | 'CUSTOMER_LOCATION_UNRESOLVED'
  | 'CUSTOMER_LOCATION_AMBIGUOUS'
  | 'NO_ROUTE'
  | 'BEYOND_MAX_DISTANCE'
  | 'DELIVERY_OUTSIDE_SERVICE_HOURS'
  | 'COLLECTION_OUTSIDE_SERVICE_HOURS';

export type DeliveryQuoteOutcome =
  | { serviceable: true; quote: DeliveryQuote }
  | { serviceable: false; reason: DeliveryQuoteNonServiceabilityReason };

export abstract class DeliveryQuoteService {
  abstract getQuote(input: GetDeliveryQuoteInput): Promise<DeliveryQuoteOutcome>;
}
