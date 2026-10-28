import type { ReportInvoicePresenceDto, ReportRentalStatusDto } from '@repo/api-contracts';

export class GetRentalOrdersReportQuery {
  constructor(
    public readonly tenantId: string,
    public readonly year: number,
    public readonly month: number | undefined,
    public readonly branchId: string | undefined,
    public readonly statuses: ReportRentalStatusDto[],
    public readonly page: number,
    public readonly pageSize: number,
    public readonly invoicePresence: ReportInvoicePresenceDto,
  ) {}
}
