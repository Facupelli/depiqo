export class UpdateAssetCommand {
  constructor(
    public readonly tenantId: string,
    public readonly assetId: string,
    public readonly serialNumber?: string | null,
    public readonly notes?: string | null,
  ) {}
}
