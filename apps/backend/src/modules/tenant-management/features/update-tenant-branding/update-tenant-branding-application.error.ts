export type UpdateTenantBrandingApplicationErrorCode = 'TenantNotFound' | 'Unexpected';

export interface UpdateTenantBrandingApplicationError {
  code: UpdateTenantBrandingApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function updateTenantBrandingApplicationError(
  code: UpdateTenantBrandingApplicationErrorCode,
  message: string,
  cause?: unknown,
): UpdateTenantBrandingApplicationError {
  return { code, message, cause };
}
