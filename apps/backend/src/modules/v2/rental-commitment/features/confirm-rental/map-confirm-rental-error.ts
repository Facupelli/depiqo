import {
  ConfirmedRentalRequiresPriceSnapshotError,
  DuplicateAssignedAssetError,
  InsufficientAssetAvailabilityError,
  RentalCannotBeConfirmedFromStatusError,
  RentalCommitmentError,
  RentalConfirmationRequiresCustomerError,
  RentalInvalidFieldError,
} from '../../domain/errors/rental-commitment.errors';
import { confirmRentalApplicationError, ConfirmRentalApplicationError } from './confirm-rental-application.error';

export function toConfirmRentalApplicationError(error: unknown): ConfirmRentalApplicationError {
  console.dir({ error }, { depth: null });

  if (error instanceof RentalCannotBeConfirmedFromStatusError) {
    return confirmRentalApplicationError('RentalCannotBeConfirmedFromStatus', error.message, error);
  }

  if (error instanceof RentalConfirmationRequiresCustomerError) {
    return confirmRentalApplicationError('RentalConfirmationRequiresCustomer', error.message, error);
  }

  if (error instanceof ConfirmedRentalRequiresPriceSnapshotError) {
    return confirmRentalApplicationError('ConfirmedRentalRequiresPriceSnapshot', error.message, error);
  }

  if (error instanceof InsufficientAssetAvailabilityError) {
    return confirmRentalApplicationError('InsufficientAssetAvailability', error.message, error);
  }

  if (error instanceof DuplicateAssignedAssetError) {
    return confirmRentalApplicationError('DuplicateAssignedAsset', error.message, error);
  }

  if (error instanceof RentalInvalidFieldError) {
    return confirmRentalApplicationError('InvalidRentalField', error.message, error);
  }

  if (error instanceof RentalCommitmentError) {
    return confirmRentalApplicationError('RentalCommitmentUnexpected', error.message, error);
  }

  return confirmRentalApplicationError('Unexpected', 'An unexpected rental commitment error occurred.', error);
}
