import { PricingCalculationError } from 'src/modules/pricing/public-api/pricing-calculation.public-api';
import {
  BranchUnavailableForRentalError,
  DuplicateAssignedAssetError,
  DuplicateRentalOfferSelectionError,
  EquipmentTypeNotFoundError,
  EquipmentTypeNotRentableError,
  InsufficientAssetAvailabilityError,
  InvalidCatalogSelectionQuantityError,
  PickupTimeOutsideBranchScheduleError,
  ProfessionalConfirmedRentalCreationDisabledError,
  RentalCommitmentError,
  RentalCustomerUnavailableForRentalError,
  RentalDemandLineNotFoundError,
  RentalInvalidFieldError,
  RentalMustContainSelectionError,
  RentalSelectionNotFoundError,
  ReturnTimeOutsideBranchScheduleError,
  TenantUnavailableForRentalError,
  TenantUserUnavailableForRentalError,
} from '../../domain/errors/rental-commitment.errors';

import {
  rentalCommitmentApplicationError,
  RentalCommitmentApplicationError,
} from './rental-commitment-application.error';

export function toRentalCommitmentApplicationError(error: unknown): RentalCommitmentApplicationError {
  if (error instanceof RentalSelectionNotFoundError) {
    return rentalCommitmentApplicationError('RentalSelectionNotFound', error.message, error);
  }

  if (error instanceof RentalDemandLineNotFoundError) {
    return rentalCommitmentApplicationError('RentalDemandLineNotFound', error.message, error);
  }

  if (error instanceof EquipmentTypeNotFoundError) {
    return rentalCommitmentApplicationError('EquipmentTypeNotFound', error.message, error);
  }

  if (error instanceof RentalInvalidFieldError) {
    return rentalCommitmentApplicationError('InvalidRentalField', error.message, error);
  }

  if (error instanceof RentalMustContainSelectionError) {
    return rentalCommitmentApplicationError('RentalMustContainSelection', error.message, error);
  }

  if (error instanceof InvalidCatalogSelectionQuantityError) {
    return rentalCommitmentApplicationError('InvalidCatalogSelectionQuantity', error.message, error);
  }

  if (error instanceof EquipmentTypeNotRentableError) {
    return rentalCommitmentApplicationError('EquipmentTypeNotRentable', error.message, error);
  }

  if (error instanceof TenantUnavailableForRentalError) {
    return rentalCommitmentApplicationError('TenantUnavailableForRental', error.message, error);
  }

  if (error instanceof BranchUnavailableForRentalError) {
    return rentalCommitmentApplicationError('BranchUnavailableForRental', error.message, error);
  }

  if (error instanceof RentalCustomerUnavailableForRentalError) {
    return rentalCommitmentApplicationError('RentalCustomerUnavailableForRental', error.message, error);
  }

  if (error instanceof TenantUserUnavailableForRentalError) {
    return rentalCommitmentApplicationError('TenantUserUnavailableForRental', error.message, error);
  }

  if (error instanceof PickupTimeOutsideBranchScheduleError) {
    return rentalCommitmentApplicationError('PickupTimeOutsideBranchSchedule', error.message, error);
  }

  if (error instanceof ReturnTimeOutsideBranchScheduleError) {
    return rentalCommitmentApplicationError('ReturnTimeOutsideBranchSchedule', error.message, error);
  }

  if (error instanceof PricingCalculationError || isPricingErrorCode(error, 'INVALID_PRICING_INPUT')) {
    return rentalCommitmentApplicationError('InvalidPricingInput', error.message, error);
  }

  if (error instanceof ProfessionalConfirmedRentalCreationDisabledError) {
    return rentalCommitmentApplicationError('ProfessionalConfirmedRentalCreationDisabled', error.message, error);
  }

  if (error instanceof DuplicateRentalOfferSelectionError) {
    return rentalCommitmentApplicationError('DuplicateRentalOfferSelection', error.message, error);
  }

  if (error instanceof DuplicateAssignedAssetError) {
    return rentalCommitmentApplicationError('DuplicateAssignedAsset', error.message, error);
  }

  if (error instanceof InsufficientAssetAvailabilityError) {
    return rentalCommitmentApplicationError('InsufficientAssetAvailability', error.message, error);
  }

  if (error instanceof RentalCommitmentError) {
    return rentalCommitmentApplicationError('RentalCommitmentUnexpected', error.message, error);
  }

  return rentalCommitmentApplicationError('Unexpected', 'An unexpected rental commitment error occurred.', error);
}

function isPricingErrorCode(error: unknown, code: string): error is Error & { code: string } {
  return error instanceof Error && 'code' in error && error.code === code;
}
