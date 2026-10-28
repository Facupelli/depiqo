import type { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type CorrectInvoiceRegistrationErrorCode =
  | 'invoicing.invalid_registration'
  | 'invoicing.invoice_not_found'
  | 'invoicing.invoice_registration_removed'
  | 'invoicing.invoice_version_conflict';

export interface CorrectInvoiceRegistrationError extends ApplicationError {
  code: CorrectInvoiceRegistrationErrorCode;
}

export function correctInvoiceRegistrationError(
  code: CorrectInvoiceRegistrationErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): CorrectInvoiceRegistrationError {
  return { code, message, cause, context };
}
