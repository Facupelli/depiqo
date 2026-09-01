export type RentalCommitmentApplicationErrorCode =
  | 'InvalidRentalPeriod'
  | 'RentalMustContainSelection'
  | 'DuplicateRentalOfferSelection'
  | 'InsufficientAssetAvailability'
  | 'ProfessionalConfirmedRentalCreationDisabled'
  | 'TenantUnavailableForRental'
  | 'BranchUnavailableForRental'
  | 'RentalCustomerUnavailableForRental'
  | 'TenantUserUnavailableForRental'
  | 'EquipmentTypeNotFound'
  | 'EquipmentTypeNotRentable'
  | 'PickupTimeOutsideBranchSchedule'
  | 'ReturnTimeOutsideBranchSchedule'
  | 'InvalidRentalField'
  | 'InvalidCatalogSelectionQuantity'
  | 'InvalidPricingInput'
  | 'RentalSelectionNotFound'
  | 'RentalDemandLineNotFound'
  | 'DuplicateAssignedAsset'
  | 'RentalCommitmentUnexpected'
  | 'Unexpected';

export interface RentalCommitmentApplicationError {
  code: RentalCommitmentApplicationErrorCode;
  message: string;
  cause?: unknown;
}

export function rentalCommitmentApplicationError(
  code: RentalCommitmentApplicationErrorCode,
  message: string,
  cause?: unknown,
): RentalCommitmentApplicationError {
  return { code, message, cause };
}
