export class GetBranchRentalAssetBufferQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
  ) {}
}
