export type TenantManagementApplicationErrorCode =
  | 'TenantRegistrationInvalidInput'
  | 'TenantSlugAlreadyInUse'
  | 'BranchNotFound'
  | 'BranchInvalidInput'
  | 'BranchScheduleInvalidInput'
  | 'RentalCustomerNotFound'
  | 'CustomerProfileNotFound'
  | 'Unexpected';

export interface TenantManagementApplicationError {
  code: TenantManagementApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function tenantManagementApplicationError(
  code: TenantManagementApplicationErrorCode,
  message: string,
  cause?: unknown,
): TenantManagementApplicationError {
  return { code, message, cause };
}
