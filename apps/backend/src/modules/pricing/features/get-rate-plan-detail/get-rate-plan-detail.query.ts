export class GetRatePlanDetailQuery {
  public readonly tenantId: string;
  public readonly ratePlanId: string;

  constructor(props: { tenantId: string; ratePlanId: string }) {
    this.tenantId = props.tenantId;
    this.ratePlanId = props.ratePlanId;
  }
}
