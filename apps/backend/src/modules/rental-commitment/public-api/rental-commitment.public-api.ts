import { Result } from 'neverthrow';

import { FulfillmentMethod, RentalStatus } from '../domain/rental-status';

export interface GetRentalNotificationContextInput {
  tenantId: string;
  rentalId: string;
}

export interface GetAcceptedPricingForDocumentsInput {
  tenantId: string;
  rentalId: string;
}

export type RentalAcceptedPricingBillingUnit = 'HOUR' | 'DAY' | 'WEEK';

export interface RentalAcceptedPricingMoney {
  amount: string;
  currency: string;
}

export interface RentalAcceptedPricingForDocuments {
  total: RentalAcceptedPricingMoney;
  chargedUnits: number;
  billingUnit?: RentalAcceptedPricingBillingUnit;
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

export type RentalCommitmentPublicApiErrorCode =
  | 'RentalNotFound'
  | 'RentalNotificationContextIncomplete'
  | 'AcceptedPricingSnapshotInvalid'
  | 'AcceptedPricingUnitsIncomplete';

export interface RentalCommitmentPublicApiError {
  code: RentalCommitmentPublicApiErrorCode;
  message: string;
  cause?: unknown;
}

export abstract class RentalCommitmentPublicApi {
  abstract getRentalNotificationContext(
    input: GetRentalNotificationContextInput,
  ): Promise<Result<RentalNotificationContext, RentalCommitmentPublicApiError>>;

  abstract getAcceptedPricingForDocuments(
    input: GetAcceptedPricingForDocumentsInput,
  ): Promise<Result<RentalAcceptedPricingForDocuments, RentalCommitmentPublicApiError>>;
}
