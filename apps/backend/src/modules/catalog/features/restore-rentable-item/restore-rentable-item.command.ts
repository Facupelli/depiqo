export class RestoreRentableItemCommand {
  constructor(
    public readonly tenantId: string,
    public readonly rentableItemId: string,
  ) {}
}
