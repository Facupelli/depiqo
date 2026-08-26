export class GetRatePlansQuery {
  public readonly tenantId: string;
  public readonly isActive?: boolean;

  constructor(props: { tenantId: string; isActive?: boolean }) {
    this.tenantId = props.tenantId;
    this.isActive = props.isActive;
  }
}
