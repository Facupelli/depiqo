import {
  InvalidTenantNameError,
  InvalidTenantSlugError,
  TenantManagementError,
  TenantSlugAlreadyInUseError,
} from '../../domain/errors/tenant-management.errors';
import {
  tenantManagementApplicationError,
  TenantManagementApplicationError,
} from '../tenant-management-application.error';

export function toRegisterTenantWithOwnerApplicationError(
  error: TenantManagementError,
): TenantManagementApplicationError {
  if (error instanceof TenantSlugAlreadyInUseError) {
    return tenantManagementApplicationError('TenantSlugAlreadyInUse', error.message, error);
  }

  if (error instanceof InvalidTenantNameError || error instanceof InvalidTenantSlugError) {
    return tenantManagementApplicationError('TenantRegistrationInvalidInput', error.message, error);
  }

  return tenantManagementApplicationError('Unexpected', 'An unexpected error occurred.', error);
}
