export class AttachRatePlanToRentalOfferCommand {
  public readonly tenantId: string;
  public readonly catalogRentalOfferId: string;
  public readonly ratePlanId: string;

  constructor(props: { tenantId: string; catalogRentalOfferId: string; ratePlanId: string }) {
    this.tenantId = props.tenantId;
    this.catalogRentalOfferId = props.catalogRentalOfferId;
    this.ratePlanId = props.ratePlanId;
  }
}
