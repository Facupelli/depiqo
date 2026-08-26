export class RemoveRentalSelectionCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      selectionId: string;
      expectedVersion: number;
    },
  ) {}
}
