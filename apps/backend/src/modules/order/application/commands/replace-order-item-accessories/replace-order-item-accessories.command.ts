export type ReplaceOrderItemAccessoryInput = {
  accessoryRentalItemId: string;
  quantity: number;
  notes: string | null;
};

export class ReplaceOrderItemAccessoriesCommand {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly orderItemId: string,
    public readonly accessories: ReplaceOrderItemAccessoryInput[],
  ) {}
}
