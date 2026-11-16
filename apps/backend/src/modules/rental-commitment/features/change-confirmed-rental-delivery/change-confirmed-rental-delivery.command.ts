import type { RentalDeliveryDetails } from '../../domain/rental.aggregate';
import type { DeliveryAgreementChange } from '../../domain/value-objects/accepted-delivery-snapshot.value-object';

export type ConfirmedDeliveryDestination =
  | { arrangement: 'STAFF_ARRANGED'; address: string; geocoding?: Omit<RentalDeliveryDetails, 'address'> }
  | {
      arrangement: 'ROUTED';
      address: string;
      locationId: string;
    };

export interface ConfirmedDeliveryDecisions {
  pricingAgreement?: DeliveryAgreementChange | { type: 'KEEP' };
  transportReservationMinutes?: number;
  policyException?: { type: 'AUTHORIZE'; reason?: string };
}

export class ChangeConfirmedRentalDeliveryCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      expectedVersion: number;
      destination?: ConfirmedDeliveryDestination;
      deliveryDecisions?: ConfirmedDeliveryDecisions;
    },
  ) {}
}
