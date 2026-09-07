export class GetEquipmentTypeAccessoryDefaultsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly equipmentTypeId: string,
  ) {}
}
