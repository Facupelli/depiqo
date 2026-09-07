import type { AssetStatusDto } from '@repo/api-contracts';

export class GetEquipmentTypeAssetsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly equipmentTypeId: string,
    public readonly search: string | undefined,
    public readonly status: AssetStatusDto | undefined,
    public readonly branchId: string | undefined,
    public readonly ownerId: string | undefined,
    public readonly page: number,
    public readonly pageSize: number,
  ) {}
}
