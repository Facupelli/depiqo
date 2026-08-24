export class AddRentalSelectionCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      expectedVersion: number;
      rentalOfferId: string;
      quantity: number;
    },
  ) {}
}
