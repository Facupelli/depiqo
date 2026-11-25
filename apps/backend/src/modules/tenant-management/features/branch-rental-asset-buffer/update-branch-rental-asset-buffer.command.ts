export class UpdateBranchRentalAssetBufferCommand {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly beforeBufferMinutes: number,
    public readonly afterBufferMinutes: number,
  ) {}
}
