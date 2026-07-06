export class GetEquipmentTypeDetailQuery {
  constructor(
    public readonly tenantId: string,
    public readonly equipmentTypeId: string,
  ) {}
}
