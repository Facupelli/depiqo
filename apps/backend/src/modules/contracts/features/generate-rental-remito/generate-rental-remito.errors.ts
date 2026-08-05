import { ApplicationError } from 'src/core/errors/application-error';

export type GenerateRentalRemitoErrorCode =
  | 'contracts.rental_remito_rental_not_found'
  | 'contracts.rental_remito_rental_not_ready'
  | 'contracts.rental_remito_customer_profile_missing'
  | 'contracts.rental_remito_branch_context_missing'
  | 'contracts.rental_remito_price_snapshot_invalid';

export interface GenerateRentalRemitoError extends ApplicationError {
  code: GenerateRentalRemitoErrorCode;
}

export function generateRentalRemitoError(
  code: GenerateRentalRemitoErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GenerateRentalRemitoError {
  return { code, message, cause, context };
}
