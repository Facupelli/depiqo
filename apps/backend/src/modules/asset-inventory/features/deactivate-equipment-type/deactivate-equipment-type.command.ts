export class DeactivateEquipmentTypeCommand {
  constructor(
    public readonly tenantId: string,
    public readonly equipmentTypeId: string,
  ) {}
}
