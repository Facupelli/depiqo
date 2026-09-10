export class ListEquipmentTypesQuery {
  constructor(
    public readonly tenantId: string,
    public readonly search: string | undefined,
    public readonly categoryId: string | undefined,
    public readonly branchId: string | undefined,
    public readonly page: number,
    public readonly pageSize: number,
  ) {}
}
