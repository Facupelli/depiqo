import type { LocalDate } from '@repo/api-contracts';

export class GetAssetAvailabilityTimelineQuery {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      branchId: string;
      from: LocalDate;
      to: LocalDate;
      equipmentTypeIds?: readonly string[];
      assetIds?: readonly string[];
      page: number;
      pageSize: number;
    },
  ) {}
}
