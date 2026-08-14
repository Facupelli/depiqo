export class GetBranchDetailQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
  ) {}
}
