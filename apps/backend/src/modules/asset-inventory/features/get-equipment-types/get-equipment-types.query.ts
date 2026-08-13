export class GetEquipmentTypesQuery {
  constructor(
    public readonly tenantId: string,
    public readonly search?: string,
    public readonly limit?: number,
  ) {}
}
