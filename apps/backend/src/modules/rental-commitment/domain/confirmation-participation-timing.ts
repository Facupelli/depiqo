import { RentalPeriod } from './value-objects/rental-period.value-object';

export interface ConfirmationParticipationTiming {
  participationPeriod: RentalPeriod;
  blockOperationTime?: Date;
}

export function deriveConfirmationParticipationTiming(
  rentalPeriod: RentalPeriod,
  confirmationTime: Date,
): ConfirmationParticipationTiming {
  if (confirmationTime < rentalPeriod.start) {
    return { participationPeriod: rentalPeriod };
  }

  if (confirmationTime < rentalPeriod.end) {
    return {
      participationPeriod: new RentalPeriod(confirmationTime, rentalPeriod.end),
      blockOperationTime: confirmationTime,
    };
  }

  // Confirmation after rental end was historically allowed and planned participation from the rental start.
  return { participationPeriod: rentalPeriod };
}
