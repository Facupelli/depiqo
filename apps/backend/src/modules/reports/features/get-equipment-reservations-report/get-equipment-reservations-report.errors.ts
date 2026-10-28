import type { ApplicationError } from 'src/core/errors/application-error';
import type { GetCurrentTenantError } from 'src/modules/tenant-management/public-api/get-current-tenant.public-api';

export interface GetEquipmentReservationsReportError extends ApplicationError {
  code: 'reports.equipment_tenant_not_found';
}

export function getEquipmentReservationsReportError(
  tenantId: string,
  cause: GetCurrentTenantError,
): GetEquipmentReservationsReportError {
  return {
    code: 'reports.equipment_tenant_not_found',
    message: cause.message,
    cause,
    context: { useCase: 'GetEquipmentReservationsReport', tenantId },
  };
}
