export type SaveOrderAccessoryPreparationAccessoryInput = {
  accessoryRentalItemId: string;
  quantity: number;
  notes: string | null;
  assetIds: string[] | null;
  autoAssignQuantity: number | null;
};

export type SaveOrderAccessoryPreparationItemInput = {
  orderItemId: string;
  accessories: SaveOrderAccessoryPreparationAccessoryInput[];
};

export class SaveOrderAccessoryPreparationCommand {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly items: SaveOrderAccessoryPreparationItemInput[],
  ) {}
}
