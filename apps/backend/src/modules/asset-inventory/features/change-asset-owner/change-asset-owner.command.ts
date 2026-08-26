export class ChangeAssetOwnerCommand {
  constructor(
    public readonly tenantId: string,
    public readonly assetId: string,
    public readonly ownerId: string | null,
  ) {}
}
