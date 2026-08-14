export class AssignCustomerToDraftRentalCommand {
  public readonly tenantId: string;
  public readonly rentalId: string;
  public readonly customerId: string;

  constructor(props: { tenantId: string; rentalId: string; customerId: string }) {
    this.tenantId = props.tenantId;
    this.rentalId = props.rentalId;
    this.customerId = props.customerId;
  }
}
