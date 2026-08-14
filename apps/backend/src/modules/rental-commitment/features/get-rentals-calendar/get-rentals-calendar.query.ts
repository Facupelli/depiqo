import type { LocalDate } from '@repo/api-contracts';

export class GetRentalsCalendarQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly from: LocalDate,
    public readonly to: LocalDate,
  ) {}
}
