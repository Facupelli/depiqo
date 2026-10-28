import type { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export interface GetInvoiceError extends ApplicationError {
  code: 'invoicing.invoice_not_found';
}

export function getInvoiceError(context: ApplicationErrorContext): GetInvoiceError {
  return { code: 'invoicing.invoice_not_found', message: 'Invoice registration not found.', context };
}
