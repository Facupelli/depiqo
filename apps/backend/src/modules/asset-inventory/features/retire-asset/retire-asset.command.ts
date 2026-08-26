export class RetireAssetCommand {
  constructor(
    public readonly tenantId: string,
    public readonly assetId: string,
  ) {}
}
