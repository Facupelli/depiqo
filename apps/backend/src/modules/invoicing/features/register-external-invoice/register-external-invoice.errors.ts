import type { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type RegisterExternalInvoiceErrorCode =
  | 'invoicing.invalid_registration'
  | 'invoicing.rental_not_found'
  | 'invoicing.rental_not_eligible';

export interface RegisterExternalInvoiceError extends ApplicationError {
  code: RegisterExternalInvoiceErrorCode;
}

export function registerExternalInvoiceError(
  code: RegisterExternalInvoiceErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): RegisterExternalInvoiceError {
  return { code, message, cause, context };
}
