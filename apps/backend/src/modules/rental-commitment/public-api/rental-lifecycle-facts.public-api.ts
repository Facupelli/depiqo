import { Result } from 'neverthrow';

export interface GetRentalLifecycleFactsInput {
  tenantId: string;
  rentalId: string;
}

export type RentalLifecycleStatus = 'PENDING' | 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface RentalLifecycleFactsResult {
  rentalId: string;
  rentalNumber: number;
  branchId: string;
  rentalCustomerId: string | null;
  status: RentalLifecycleStatus;
  periodStart: Date;
  periodEnd: Date;
}

export interface RentalLifecycleFactsError {
  code: 'RentalNotFound';
  message: string;
}

export abstract class RentalLifecycleFacts {
  abstract getRentalLifecycleFacts(
    input: GetRentalLifecycleFactsInput,
  ): Promise<Result<RentalLifecycleFactsResult, RentalLifecycleFactsError>>;
}
