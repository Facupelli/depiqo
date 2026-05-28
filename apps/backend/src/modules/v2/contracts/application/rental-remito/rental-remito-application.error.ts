export type RentalRemitoApplicationErrorCode =
  | 'RentalNotFound'
  | 'RentalNotReady'
  | 'CustomerProfileMissing'
  | 'CustomerEmailMissing'
  | 'TenantSignerMissing'
  | 'BranchContextMissing'
  | 'PriceSnapshotInvalid'
  | 'ContractAlreadySigned'
  | 'Unexpected';

export interface RentalRemitoApplicationError {
  code: RentalRemitoApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function rentalRemitoApplicationError(
  code: RentalRemitoApplicationErrorCode,
  message: string,
  cause?: unknown,
): RentalRemitoApplicationError {
  return { code, message, cause };
}
