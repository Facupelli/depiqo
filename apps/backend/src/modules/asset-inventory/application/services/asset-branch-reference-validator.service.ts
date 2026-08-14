import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';

export type AssetBranchReferenceValidationError =
  | { code: 'BranchNotFound'; branchId?: string }
  | { code: 'BranchInactive'; branchId: string }
  | { code: 'BranchDeleted'; branchId: string }
  | { code: 'BranchReferenceUnavailable' };

@Injectable()
export class AssetBranchReferenceValidatorService {
  constructor(private readonly tenantManagement: BranchFacts) {}

  async validateOperationalBranches(input: {
    tenantId: string;
    branchIds: string[];
  }): Promise<Result<void, AssetBranchReferenceValidationError>> {
    const branchIds = [...new Set(input.branchIds)];
    if (branchIds.length === 0) {
      return ok(undefined);
    }

    const branchContexts = await this.tenantManagement.getBranchFactsBatch({
      tenantId: input.tenantId,
      branchIds,
    });
    if (branchContexts.isErr()) {
      return err(
        branchContexts.error.code === 'BranchNotFound'
          ? { code: 'BranchNotFound' }
          : { code: 'BranchReferenceUnavailable' },
      );
    }

    const branchesById = new Map(branchContexts.value.map((branch) => [branch.branchId, branch]));
    for (const branchId of branchIds) {
      const branch = branchesById.get(branchId);
      if (!branch) {
        return err({ code: 'BranchNotFound', branchId });
      }
      if (branch.isDeleted) {
        return err({ code: 'BranchDeleted', branchId });
      }
      if (!branch.isActive) {
        return err({ code: 'BranchInactive', branchId });
      }
    }

    return ok(undefined);
  }
}
