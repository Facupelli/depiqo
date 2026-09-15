import type { ApplicationError } from 'src/core/errors/application-error';

export type ChangePasswordErrorCode =
  | 'tenant_management.current_password_incorrect'
  | 'tenant_management.local_credential_not_found';

export interface ChangePasswordError extends ApplicationError {
  code: ChangePasswordErrorCode;
}

export function changePasswordError(
  code: ChangePasswordErrorCode,
  message: string,
  context: Record<string, unknown>,
): ChangePasswordError {
  return { code, message, context };
}
