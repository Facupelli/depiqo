export class RestoreConfirmedPackageDemandLineCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      demandLineId: string;
      expectedVersion: number;
    },
  ) {}
}
