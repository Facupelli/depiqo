import type { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type RemoveInvoiceRegistrationErrorCode =
  | 'invoicing.invoice_not_found'
  | 'invoicing.invoice_registration_removed'
  | 'invoicing.invoice_version_conflict';

export interface RemoveInvoiceRegistrationError extends ApplicationError {
  code: RemoveInvoiceRegistrationErrorCode;
}

export function removeInvoiceRegistrationError(
  code: RemoveInvoiceRegistrationErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): RemoveInvoiceRegistrationError {
  return { code, message, cause, context };
}
