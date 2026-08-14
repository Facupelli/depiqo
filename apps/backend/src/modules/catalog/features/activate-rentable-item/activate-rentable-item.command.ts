export class ActivateRentableItemCommand {
  constructor(
    public readonly tenantId: string,
    public readonly rentableItemId: string,
  ) {}
}
