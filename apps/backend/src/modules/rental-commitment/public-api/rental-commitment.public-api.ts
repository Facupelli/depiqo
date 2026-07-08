import { Result } from 'neverthrow';

import { FulfillmentMethod, RentalStatus } from '../domain/rental-status';

export interface GetRentalNotificationContextInput {
  tenantId: string;
  rentalId: string;
}

export interface RentalNotificationContext {
  rentalId: string;
  rentalNumber: number | string;
  tenantId: string;
  branchId: string;
  rentalCustomerId: string | null;
  status: RentalStatus;
  fulfillmentMethod: FulfillmentMethod;
  periodStart: Date;
  periodEnd: Date;
}

export type RentalCommitmentPublicApiErrorCode = 'RentalNotFound' | 'RentalNotificationContextIncomplete';

export interface RentalCommitmentPublicApiError {
  code: RentalCommitmentPublicApiErrorCode;
  message: string;
  cause?: unknown;
}

export abstract class RentalCommitmentPublicApi {
  abstract getRentalNotificationContext(
    input: GetRentalNotificationContextInput,
  ): Promise<Result<RentalNotificationContext, RentalCommitmentPublicApiError>>;
}
