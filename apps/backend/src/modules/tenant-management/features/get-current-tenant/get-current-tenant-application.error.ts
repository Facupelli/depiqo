export type GetCurrentTenantApplicationErrorCode = 'TenantNotFound' | 'Unexpected';

export interface GetCurrentTenantApplicationError {
  code: GetCurrentTenantApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function getCurrentTenantApplicationError(
  code: GetCurrentTenantApplicationErrorCode,
  message: string,
  cause?: unknown,
): GetCurrentTenantApplicationError {
  return { code, message, cause };
}
