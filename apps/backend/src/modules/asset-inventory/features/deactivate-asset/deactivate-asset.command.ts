export class DeactivateAssetCommand {
  constructor(
    public readonly tenantId: string,
    public readonly assetId: string,
  ) {}
}
