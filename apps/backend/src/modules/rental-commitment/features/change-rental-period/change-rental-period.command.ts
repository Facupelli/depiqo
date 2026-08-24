export class ChangeRentalPeriodCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      expectedVersion: number;
      start: Date;
      end: Date;
    },
  ) {}
}
