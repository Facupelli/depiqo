export class CancelRentalCommand {
  constructor(
    public readonly tenantId: string,
    public readonly rentalId: string,
  ) {}
}
