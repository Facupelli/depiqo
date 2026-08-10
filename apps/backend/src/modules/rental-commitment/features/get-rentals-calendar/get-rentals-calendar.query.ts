export class GetRentalsCalendarQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly from: string,
    public readonly to: string,
  ) {}
}
