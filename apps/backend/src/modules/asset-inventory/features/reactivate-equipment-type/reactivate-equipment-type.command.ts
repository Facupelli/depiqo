export class ReactivateEquipmentTypeCommand {
  constructor(
    public readonly tenantId: string,
    public readonly equipmentTypeId: string,
  ) {}
}
