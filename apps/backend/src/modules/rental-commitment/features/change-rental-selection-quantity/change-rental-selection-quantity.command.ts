export class ChangeRentalSelectionQuantityCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      selectionId: string;
      expectedVersion: number;
      quantity: number;
      releaseAssetIds: string[];
    },
  ) {}
}
