import { Result } from 'neverthrow';

export type BranchScheduleOperation = 'PICKUP' | 'RETURN';

export interface EvaluateBranchScheduleEligibilityInput {
  tenantId: string;
  branchId: string;
  operation: BranchScheduleOperation;
  operationAt: Date;
}

export interface BranchScheduleEligibilityResult {
  eligible: boolean;
}

export type BranchScheduleEligibilityError =
  | { code: 'BranchNotFound'; message: string }
  | { code: 'TenantConfigurationInvalid'; message: string };

export abstract class BranchScheduleEligibility {
  abstract evaluateBranchScheduleEligibility(
    input: EvaluateBranchScheduleEligibilityInput,
  ): Promise<Result<BranchScheduleEligibilityResult, BranchScheduleEligibilityError>>;
}
