import {
  BranchScheduleOverlapError,
  InvalidBranchNameError,
  InvalidBranchScheduleDayOfWeekError,
  InvalidBranchScheduleDaySpecificationError,
  InvalidBranchScheduleTypeError,
  InvalidBranchScheduleWindowError,
  InvalidTimezoneError,
  TenantManagementError,
} from '../../domain/errors/tenant-management.errors';
import {
  tenantManagementApplicationError,
  TenantManagementApplicationError,
} from '../tenant-management-application.error';

export function toCreateBranchApplicationError(error: TenantManagementError): TenantManagementApplicationError {
  if (error instanceof InvalidBranchNameError || error instanceof InvalidTimezoneError) {
    return tenantManagementApplicationError('BranchInvalidInput', error.message, error);
  }

  if (
    error instanceof InvalidBranchScheduleTypeError ||
    error instanceof InvalidBranchScheduleDaySpecificationError ||
    error instanceof InvalidBranchScheduleDayOfWeekError ||
    error instanceof InvalidBranchScheduleWindowError ||
    error instanceof BranchScheduleOverlapError
  ) {
    return tenantManagementApplicationError('BranchScheduleInvalidInput', error.message, error);
  }

  return tenantManagementApplicationError('Unexpected', 'An unexpected error occurred.', error);
}
