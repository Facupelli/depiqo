export class GetStorefrontBranchSchedulesQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
  ) {}
}
