export type UpdateTenantConfigApplicationErrorCode = 'TenantNotFound' | 'InvalidTenantConfig' | 'Unexpected';

export interface UpdateTenantConfigApplicationError {
  code: UpdateTenantConfigApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function updateTenantConfigApplicationError(
  code: UpdateTenantConfigApplicationErrorCode,
  message: string,
  cause?: unknown,
): UpdateTenantConfigApplicationError {
  return { code, message, cause };
}
