import type { ApplicationError, ApplicationErrorContext } from 'src/core/errors/application-error';

export type GetRentalFinancialReportErrorCode =
  | 'rental_commitment.financial_report_tenant_not_found'
  | 'rental_commitment.financial_report_currency_mismatch';

export interface GetRentalFinancialReportError extends ApplicationError {
  code: GetRentalFinancialReportErrorCode;
}

export function getRentalFinancialReportError(
  code: GetRentalFinancialReportErrorCode,
  message: string,
  cause?: unknown,
  context?: ApplicationErrorContext,
): GetRentalFinancialReportError {
  return { code, message, cause, context };
}
