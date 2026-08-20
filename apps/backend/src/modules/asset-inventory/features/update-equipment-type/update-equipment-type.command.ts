export class UpdateEquipmentTypeCommand {
  constructor(
    public readonly tenantId: string,
    public readonly equipmentTypeId: string,
    public readonly name?: string,
    public readonly description?: string | null,
    public readonly imageUrl?: string | null,
    public readonly categoryId?: string | null,
  ) {}
}
