import { Result } from 'neverthrow';

export interface CategoryDisplayFact {
  id: string;
  name: string;
  sortOrder: number;
}

export interface GetCategoryDisplayFactsInput {
  tenantId: string;
  categoryIds: string[];
}

export interface ValidateCategoryAssignmentInput {
  tenantId: string;
  categoryId: string;
}

export type CategoryAssignmentValidationError =
  | { code: 'CategoryNotFound'; message: string }
  | { code: 'CategoryInactive'; message: string };

export abstract class TenantCategoryTaxonomy {
  abstract getCategoryDisplayFacts(input: GetCategoryDisplayFactsInput): Promise<CategoryDisplayFact[]>;

  abstract validateCategoryAssignment(
    input: ValidateCategoryAssignmentInput,
  ): Promise<Result<void, CategoryAssignmentValidationError>>;
}
