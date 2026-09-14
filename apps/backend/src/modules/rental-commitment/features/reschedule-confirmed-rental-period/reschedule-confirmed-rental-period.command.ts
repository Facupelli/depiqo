export class RescheduleConfirmedRentalPeriodCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      expectedVersion: number;
      periodStart: Date;
      periodEnd: Date;
    },
  ) {}
}
