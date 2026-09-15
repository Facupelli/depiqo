export class RemoveConfirmedPackageDemandLineCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      demandLineId: string;
      expectedVersion: number;
      quantity: number;
      releaseAssetIds: readonly string[];
    },
  ) {}
}
