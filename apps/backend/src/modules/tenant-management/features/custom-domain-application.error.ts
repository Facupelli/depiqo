export type CustomDomainApplicationErrorCode =
  | 'InvalidCustomDomain'
  | 'UnsupportedApexCustomDomain'
  | 'TenantNotFound'
  | 'CustomDomainAlreadyInUse'
  | 'TenantAlreadyHasCustomDomain'
  | 'CustomDomainNotFound'
  | 'Unexpected';

export interface CustomDomainApplicationError {
  code: CustomDomainApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function customDomainApplicationError(
  code: CustomDomainApplicationErrorCode,
  message: string,
  cause?: unknown,
): CustomDomainApplicationError {
  return { code, message, cause };
}
