import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  CategoryAssignmentValidationError,
  CategoryDisplayFact,
  GetCategoryDisplayFactsInput,
  TenantCategoryTaxonomy,
  ValidateCategoryAssignmentInput,
} from './tenant-category-taxonomy.public-api';

@Injectable()
export class TenantCategoryTaxonomyService extends TenantCategoryTaxonomy {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getCategoryDisplayFacts(input: GetCategoryDisplayFactsInput): Promise<CategoryDisplayFact[]> {
    const categoryIds = [...new Set(input.categoryIds)];
    if (categoryIds.length === 0) return [];

    return this.prisma.client.v2Category.findMany({
      where: {
        id: { in: categoryIds },
        tenantId: input.tenantId,
        deletedAt: null,
      },
      select: { id: true, name: true, sortOrder: true },
    });
  }

  async validateCategoryAssignment(
    input: ValidateCategoryAssignmentInput,
  ): Promise<Result<void, CategoryAssignmentValidationError>> {
    const category = await this.prisma.client.v2Category.findFirst({
      where: { id: input.categoryId, tenantId: input.tenantId, deletedAt: null },
      select: { isActive: true },
    });

    if (!category) {
      return err({
        code: 'CategoryNotFound',
        message: `Category "${input.categoryId}" was not found.`,
      });
    }
    if (!category.isActive) {
      return err({
        code: 'CategoryInactive',
        message: `Category "${input.categoryId}" is inactive.`,
      });
    }

    return ok(undefined);
  }
}
