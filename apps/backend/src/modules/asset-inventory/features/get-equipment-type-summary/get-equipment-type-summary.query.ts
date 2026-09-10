export class GetEquipmentTypeSummaryQuery {
  constructor(
    public readonly tenantId: string,
    public readonly equipmentTypeId: string,
  ) {}
}
