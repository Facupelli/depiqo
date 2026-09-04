export interface ResolvedCustomerLocation {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  providerPlaceId?: string;
}

export type DeliveryServiceLevel = 'NORMAL' | 'SPECIAL';

export interface DeliveryQuoteLeg {
  scheduledAt: Date;
  serviceLevel: DeliveryServiceLevel;
  basePrice: string;
  surcharge: string;
  total: string;
}

export interface DeliveryQuote {
  resolvedCustomerLocation: ResolvedCustomerLocation;
  distanceMeters: number;
  currency: string;
  delivery: DeliveryQuoteLeg;
  collection: DeliveryQuoteLeg;
  deliveryTotal: string;
  transportReservationMinutes: number;
  calculatedAt: Date;
}

export type DeliveryQuoteNonServiceability =
  | { code: 'BEYOND_MAX_DISTANCE' }
  | { code: 'DELIVERY_OUTSIDE_SERVICE_HOURS' }
  | { code: 'COLLECTION_OUTSIDE_SERVICE_HOURS' };
