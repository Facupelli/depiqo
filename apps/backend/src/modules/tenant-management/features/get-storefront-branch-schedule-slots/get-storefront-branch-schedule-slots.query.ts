import type { LocalDate } from '@repo/api-contracts';

export class GetStorefrontBranchScheduleSlotsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly periodStart?: LocalDate,
    public readonly periodEnd?: LocalDate,
  ) {}
}
