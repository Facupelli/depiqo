export class CreateRentalOfferForRentableItemCommand {
  public readonly tenantId: string;
  public readonly rentableItemId: string;
  public readonly branchId: string;
  public readonly launch: boolean;

  constructor(props: { tenantId: string; rentableItemId: string; branchId: string; launch?: boolean }) {
    this.tenantId = props.tenantId;
    this.rentableItemId = props.rentableItemId;
    this.branchId = props.branchId;
    this.launch = props.launch ?? false;
  }
}
