export class PreviewConfirmedRentalPeriodQuery {
  constructor(
    public readonly props: {
      tenantId: string;
      rentalId: string;
      expectedVersion: number;
      periodStart: Date;
      periodEnd: Date;
    },
  ) {}
}
