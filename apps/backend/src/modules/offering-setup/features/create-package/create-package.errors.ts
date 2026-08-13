import { ApplicationError } from 'src/core/errors/application-error';

export type CreatePackageErrorCode =
  | 'offering_setup.tenant_unavailable'
  | 'offering_setup.branch_unavailable'
  | 'offering_setup.equipment_type_not_found'
  | 'offering_setup.insufficient_active_equipment_stock'
  | 'offering_setup.invalid_package';

export interface CreatePackageError extends ApplicationError {
  code: CreatePackageErrorCode;
}

export function createPackageError(
  code: CreatePackageErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreatePackageError {
  return { code, message, cause, context };
}
