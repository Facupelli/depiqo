import { DeliveryAgreementChange } from '../../domain/value-objects/accepted-delivery-snapshot.value-object';

export class ChangeConfirmedRentalDeliveryAgreementCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      expectedVersion: number;
      agreement: DeliveryAgreementChange;
    },
  ) {}
}
