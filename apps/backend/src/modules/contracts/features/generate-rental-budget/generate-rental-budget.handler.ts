import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  RentalBudgetDocumentError,
  RentalBudgetDocumentService,
  RenderRentalBudgetResult,
} from '../../application/rental-budget/rental-budget-document.service';
import {
  GenerateRentalBudgetError,
  GenerateRentalBudgetErrorCode,
  generateRentalBudgetError,
} from './generate-rental-budget.errors';
import { GenerateRentalBudgetQuery } from './generate-rental-budget.query';

export type GenerateRentalBudgetResult = Result<RenderRentalBudgetResult, GenerateRentalBudgetError>;

@QueryHandler(GenerateRentalBudgetQuery)
export class GenerateRentalBudgetHandler implements IQueryHandler<GenerateRentalBudgetQuery, GenerateRentalBudgetResult> {
  constructor(private readonly documentService: RentalBudgetDocumentService) {}

  async execute(query: GenerateRentalBudgetQuery): Promise<GenerateRentalBudgetResult> {
    const result = await this.documentService.render({
      tenantId: query.tenantId,
      rentalId: query.rentalId,
      customer: query.customer,
    });
    if (result.isOk()) return ok(result.value);

    const code = errorCodeMap[result.error.code];
    return err(
      generateRentalBudgetError(code, result.error.message, result.error, {
        useCase: 'GenerateRentalBudget',
        tenantId: query.tenantId,
        rentalId: query.rentalId,
      }),
    );
  }
}

const errorCodeMap: Record<RentalBudgetDocumentError['code'], GenerateRentalBudgetErrorCode> = {
  RentalNotFound: 'contracts.rental_budget_rental_not_found',
  RentalNotDraft: 'contracts.rental_budget_rental_not_draft',
  CustomerNameMissing: 'contracts.rental_budget_customer_name_missing',
  ContextMissing: 'contracts.rental_budget_context_missing',
  PriceSnapshotInvalid: 'contracts.rental_budget_price_snapshot_invalid',
};
