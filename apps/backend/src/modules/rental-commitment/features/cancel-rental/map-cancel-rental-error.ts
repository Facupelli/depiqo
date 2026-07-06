import {
  RentalAlreadyCancelledError,
  RentalCannotBeCancelledFromStatusError,
  RentalCommitmentError,
} from '../../domain/errors/rental-commitment.errors';
import { cancelRentalApplicationError, CancelRentalApplicationError } from './cancel-rental-application.error';

export function toCancelRentalApplicationError(error: unknown): CancelRentalApplicationError {
  if (error instanceof RentalAlreadyCancelledError) {
    return cancelRentalApplicationError('RentalAlreadyCancelled', error.message, error);
  }

  if (error instanceof RentalCannotBeCancelledFromStatusError) {
    return cancelRentalApplicationError('RentalCannotBeCancelledFromStatus', error.message, error);
  }

  if (error instanceof RentalCommitmentError) {
    return cancelRentalApplicationError('RentalCommitmentUnexpected', error.message, error);
  }

  return cancelRentalApplicationError('Unexpected', 'An unexpected rental cancellation error occurred.', error);
}
