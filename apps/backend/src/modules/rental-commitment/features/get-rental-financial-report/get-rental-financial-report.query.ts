export class GetRentalFinancialReportQuery {
  constructor(
    public readonly tenantId: string,
    public readonly year: number,
  ) {}
}
