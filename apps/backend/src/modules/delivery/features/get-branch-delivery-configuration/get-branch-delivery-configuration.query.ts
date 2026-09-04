export class GetBranchDeliveryConfigurationQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
  ) {}
}
