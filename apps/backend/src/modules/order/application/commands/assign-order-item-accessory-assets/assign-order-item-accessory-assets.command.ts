export class AssignOrderItemAccessoryAssetsCommand {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly orderItemId: string,
    public readonly orderItemAccessoryId: string,
    public readonly quantity: number | null,
    public readonly assetIds: string[],
  ) {}
}
