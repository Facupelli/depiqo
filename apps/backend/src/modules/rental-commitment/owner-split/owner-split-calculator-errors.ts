export type RentalOwnerSplitCalculationErrorCode =
  | 'MISSING_PRICE_LINE'
  | 'DUPLICATED_PRICE_LINE'
  | 'SELECTION_WITHOUT_ASSIGNED_ASSETS'
  | 'INVALID_THIRD_PARTY_ASSET_OWNER'
  | 'MISSING_OWNER_CONTRACT_SNAPSHOT'
  | 'UNSUPPORTED_OWNER_CONTRACT_BASIS'
  | 'INVALID_OWNER_SHARE'
  | 'INVALID_MONEY_AMOUNT';

export class RentalOwnerSplitCalculationError extends Error {
  constructor(
    public readonly code: RentalOwnerSplitCalculationErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'RentalOwnerSplitCalculationError';
  }
}
