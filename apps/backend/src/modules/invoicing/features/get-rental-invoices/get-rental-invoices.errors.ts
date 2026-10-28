import type { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export interface GetRentalInvoicesError extends ApplicationError {
  code: 'invoicing.rental_not_found';
}

export function getRentalInvoicesError(cause: unknown, context: ApplicationErrorContext): GetRentalInvoicesError {
  return { code: 'invoicing.rental_not_found', message: 'Rental not found.', cause, context };
}
