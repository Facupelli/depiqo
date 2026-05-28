export class GetStorefrontBranchScheduleSlotsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly periodStart?: string,
    public readonly periodEnd?: string,
  ) {}
}
