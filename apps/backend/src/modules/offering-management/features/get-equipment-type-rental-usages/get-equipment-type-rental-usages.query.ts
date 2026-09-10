export class GetEquipmentTypeRentalUsagesQuery {
  constructor(
    public readonly tenantId: string,
    public readonly equipmentTypeId: string,
  ) {}
}
