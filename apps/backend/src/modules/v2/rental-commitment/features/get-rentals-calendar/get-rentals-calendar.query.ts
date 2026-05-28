export class GetRentalsCalendarQuery {
  constructor(
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly from: Date,
    public readonly to: Date,
  ) {}
}
