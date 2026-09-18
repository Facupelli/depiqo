import type { LocalDate } from '@repo/api-contracts';

export class GetRentalOperationsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly from: LocalDate,
    public readonly to: LocalDate,
  ) {}
}
