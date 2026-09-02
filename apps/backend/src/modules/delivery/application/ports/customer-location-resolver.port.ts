import { ResolvedCustomerLocation } from '../../domain/delivery-quote.types';

export interface CustomerLocationSelection {
  address: string;
}

export type CustomerLocationResolution =
  | { outcome: 'RESOLVED'; location: ResolvedCustomerLocation }
  | { outcome: 'UNRESOLVED' }
  | { outcome: 'AMBIGUOUS' };

export abstract class CustomerLocationResolver {
  abstract resolve(selection: CustomerLocationSelection): Promise<CustomerLocationResolution>;
}
