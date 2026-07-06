export type GetPublicTenantConfigApplicationErrorCode = 'TenantNotFound' | 'Unexpected';

export interface GetPublicTenantConfigApplicationError {
  code: GetPublicTenantConfigApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function getPublicTenantConfigApplicationError(
  code: GetPublicTenantConfigApplicationErrorCode,
  message: string,
  cause?: unknown,
): GetPublicTenantConfigApplicationError {
  return { code, message, cause };
}
