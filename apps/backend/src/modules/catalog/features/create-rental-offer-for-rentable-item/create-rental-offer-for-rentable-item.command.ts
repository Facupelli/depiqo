export class CreateRentalOfferForRentableItemCommand {
  public readonly tenantId: string;
  public readonly rentableItemId: string;
  public readonly branchId: string;

  constructor(props: { tenantId: string; rentableItemId: string; branchId: string }) {
    this.tenantId = props.tenantId;
    this.rentableItemId = props.rentableItemId;
    this.branchId = props.branchId;
  }
}
