import type { ApplicationError } from 'src/core/errors/application-error';
import type { GetCurrentTenantError } from 'src/modules/tenant-management/public-api/get-current-tenant.public-api';

export interface GetRentalOrdersReportError extends ApplicationError {
  code: 'reports.rentals_tenant_not_found';
}

export function getRentalOrdersReportError(tenantId: string, cause: GetCurrentTenantError): GetRentalOrdersReportError {
  return {
    code: 'reports.rentals_tenant_not_found',
    message: cause.message,
    cause,
    context: { useCase: 'GetRentalOrdersReport', tenantId },
  };
}
