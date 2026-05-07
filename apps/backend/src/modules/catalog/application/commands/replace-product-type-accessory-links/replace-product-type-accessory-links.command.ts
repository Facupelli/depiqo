export type ReplaceProductTypeAccessoryLinkInput = {
  accessoryRentalItemId: string;
  isDefaultIncluded: boolean;
  defaultQuantity: number;
  notes: string | null;
};

export class ReplaceProductTypeAccessoryLinksCommand {
  constructor(
    public readonly tenantId: string,
    public readonly primaryRentalItemId: string,
    public readonly accessoryLinks: ReplaceProductTypeAccessoryLinkInput[],
  ) {}
}
