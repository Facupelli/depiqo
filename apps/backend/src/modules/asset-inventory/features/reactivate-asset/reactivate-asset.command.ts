export class ReactivateAssetCommand {
  constructor(
    public readonly tenantId: string,
    public readonly assetId: string,
  ) {}
}
