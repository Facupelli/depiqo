import { Result } from 'neverthrow';

export interface GetRentalPhysicalAssignmentsInput {
  tenantId: string;
  rentalId: string;
}

export interface RentalDemandPhysicalAssignment {
  demandLineId: string;
  assignedAssetIds: string[];
}

export interface RentalPhysicalAssignmentsResult {
  demandAssignments: RentalDemandPhysicalAssignment[];
}

export interface RentalPhysicalAssignmentsError {
  code: 'RentalNotFound';
  message: string;
}

export abstract class RentalPhysicalAssignments {
  abstract getRentalPhysicalAssignments(
    input: GetRentalPhysicalAssignmentsInput,
  ): Promise<Result<RentalPhysicalAssignmentsResult, RentalPhysicalAssignmentsError>>;
}
