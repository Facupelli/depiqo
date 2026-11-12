import type { DeliveryQuote, ResolvedCustomerLocation } from '../domain/delivery-quote.types';

export type {
  DeliveryQuote,
  DeliveryQuoteLeg,
  DeliveryServiceLevel,
  ResolvedCustomerLocation,
} from '../domain/delivery-quote.types';

export type CustomerLocationSelection =
  | {
      address: string;
      locationId: string;
    }
  | {
      resolvedLocation: ResolvedCustomerLocation;
    };

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
  | 'NO_ROUTE'
  | 'BEYOND_MAX_DISTANCE'
  | 'DELIVERY_OUTSIDE_SERVICE_HOURS'
  | 'COLLECTION_OUTSIDE_SERVICE_HOURS';

export type DeliveryQuoteOutcome =
  | { serviceable: true; quote: DeliveryQuote }
  | { serviceable: false; reason: DeliveryQuoteNonServiceabilityReason };

export type DeliveryPolicyRestriction = Extract<
  DeliveryQuoteNonServiceabilityReason,
  | 'NOT_CONFIGURED'
  | 'DISABLED'
  | 'BEYOND_MAX_DISTANCE'
  | 'DELIVERY_OUTSIDE_SERVICE_HOURS'
  | 'COLLECTION_OUTSIDE_SERVICE_HOURS'
>;

export type DeliveryEvaluationOutcome =
  | {
      transportValid: false;
      reason: Exclude<DeliveryQuoteNonServiceabilityReason, DeliveryPolicyRestriction> | 'INVALID_PERIOD';
    }
  | {
      transportValid: true;
      branchId: string;
      resolvedCustomerLocation: ResolvedCustomerLocation;
      distanceMeters: number;
      deliveryScheduledAt: Date;
      collectionScheduledAt: Date;
      // Undefined means a staff workflow must explicitly provide a value, including explicit zero.
      transportReservationMinutes?: number;
      currency?: string;
      restrictions: DeliveryPolicyRestriction[];
      quote?: DeliveryQuote;
    };

export abstract class DeliveryQuoteService {
  abstract getQuote(input: GetDeliveryQuoteInput): Promise<DeliveryQuoteOutcome>;

  // Evaluation reports policy restrictions, but never grants authority to override them.
  abstract evaluate(input: GetDeliveryQuoteInput): Promise<DeliveryEvaluationOutcome>;
}
