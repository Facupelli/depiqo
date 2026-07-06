import { err, ok, Result } from 'neverthrow';

import { RentalCommitmentError, RentalInvalidFieldError } from '../errors/rental-commitment.errors';

export class RentalQuantity {
  private constructor(private readonly quantityValue: number) {}

  get value(): number {
    return this.quantityValue;
  }

  multiply(multiplier: RentalQuantity): RentalQuantity {
    return new RentalQuantity(this.quantityValue * multiplier.value);
  }

  equals(other: RentalQuantity): boolean {
    return this.quantityValue === other.quantityValue;
  }

  static create(value: number, field = 'quantity'): Result<RentalQuantity, RentalCommitmentError> {
    if (!Number.isInteger(value) || value <= 0) {
      return err(new RentalInvalidFieldError(field, 'must be a positive integer'));
    }

    return ok(new RentalQuantity(value));
  }

  static reconstitute(value: number): RentalQuantity {
    return new RentalQuantity(value);
  }
}
