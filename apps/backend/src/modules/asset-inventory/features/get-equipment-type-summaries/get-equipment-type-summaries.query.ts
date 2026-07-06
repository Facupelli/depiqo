export class GetEquipmentTypeSummariesQuery {
  constructor(
    public readonly tenantId: string,
    public readonly isActive: boolean | undefined,
    public readonly search: string | undefined,
    public readonly branchId: string | undefined,
    public readonly page: number,
    public readonly pageSize: number,
  ) {}
}
