export class GetPromotionDetailQuery {
  public readonly tenantId: string;
  public readonly promotionId: string;

  constructor(props: { tenantId: string; promotionId: string }) {
    this.tenantId = props.tenantId;
    this.promotionId = props.promotionId;
  }
}
