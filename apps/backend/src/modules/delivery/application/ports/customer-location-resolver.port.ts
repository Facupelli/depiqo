import { ResolvedCustomerLocation } from '../../domain/delivery-quote.types';

export interface CustomerLocationSelection {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export type CustomerLocationResolution =
  | { outcome: 'RESOLVED'; location: ResolvedCustomerLocation }
  | { outcome: 'UNRESOLVED' }
  | { outcome: 'AMBIGUOUS' };

export abstract class CustomerLocationResolver {
  abstract resolve(selection: CustomerLocationSelection): Promise<CustomerLocationResolution>;
}
