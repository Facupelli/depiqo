import { ApplicationError } from 'src/core/errors/application-error';

export type CreateIndividualRentalErrorCode =
  | 'catalog.invalid_individual_rental'
  | 'catalog.equipment_type_not_found'
  | 'catalog.branch_not_found'
  | 'catalog.branch_inactive'
  | 'catalog.branch_deleted'
  | 'catalog.branch_context_unavailable';

export interface CreateIndividualRentalError extends ApplicationError {
  code: CreateIndividualRentalErrorCode;
}

export function createIndividualRentalError(
  code: CreateIndividualRentalErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreateIndividualRentalError {
  return { code, message, cause, context };
}
