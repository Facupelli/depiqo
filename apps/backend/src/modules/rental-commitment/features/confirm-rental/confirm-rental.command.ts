export class ConfirmRentalCommand {
  constructor(
    public readonly tenantId: string,
    public readonly rentalId: string,
  ) {}
}
