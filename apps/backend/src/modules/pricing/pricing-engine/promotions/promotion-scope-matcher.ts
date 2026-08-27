import { PricingContextLine } from '../final/pricing-context.types';
import { PromotionExclusionInput, PromotionScopeInput } from './promotion-input.types';

export class PromotionScopeMatcher {
  getEligibleLines(input: {
    lines: PricingContextLine[];
    scopes: PromotionScopeInput[];
    exclusions: PromotionExclusionInput[];
  }): PricingContextLine[] {
    const { lines, scopes, exclusions } = input;

    return lines.filter((line) => {
      const matchesScope = scopes.some((scope) => this.matchesScope({ line, scope }));

      if (!matchesScope) {
        return false;
      }

      const isExcluded = exclusions.some((exclusion) => this.matchesExclusion({ line, exclusion }));

      return !isExcluded;
    });
  }

  private matchesScope(input: { line: PricingContextLine; scope: PromotionScopeInput }): boolean {
    const { line, scope } = input;

    if (scope.appliesToAll) {
      return true;
    }

    if (scope.rentalOfferId && scope.rentalOfferId === line.rentalOfferId) {
      return true;
    }

    if (scope.rentableItemId && scope.rentableItemId === line.rentableItemId) {
      return true;
    }

    if (scope.categoryId && scope.categoryId === line.categoryId) {
      return true;
    }

    return false;
  }

  private matchesExclusion(input: { line: PricingContextLine; exclusion: PromotionExclusionInput }): boolean {
    const { line, exclusion } = input;

    if (exclusion.rentalOfferId && exclusion.rentalOfferId === line.rentalOfferId) {
      return true;
    }

    if (exclusion.rentableItemId && exclusion.rentableItemId === line.rentableItemId) {
      return true;
    }

    if (exclusion.categoryId && exclusion.categoryId === line.categoryId) {
      return true;
    }

    if (exclusion.rentableItemKind && exclusion.rentableItemKind === line.rentableItemKind) {
      return true;
    }

    return false;
  }
}
