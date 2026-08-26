import { ApplicationError } from 'src/core/errors/application-error';

export type GenerateRentalBudgetErrorCode =
  | 'contracts.rental_budget_rental_not_found'
  | 'contracts.rental_budget_rental_not_draft'
  | 'contracts.rental_budget_customer_name_missing'
  | 'contracts.rental_budget_context_missing'
  | 'contracts.rental_budget_price_snapshot_invalid';

export interface GenerateRentalBudgetError extends ApplicationError {
  code: GenerateRentalBudgetErrorCode;
}

export function generateRentalBudgetError(
  code: GenerateRentalBudgetErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GenerateRentalBudgetError {
  return { code, message, cause, context };
}
