export class ArchiveRentableItemCommand {
  constructor(
    public readonly tenantId: string,
    public readonly rentableItemId: string,
  ) {}
}
