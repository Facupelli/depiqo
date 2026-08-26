import type { LocalDate } from '@repo/api-contracts';

export class ValidityWindowChecker {
  isWithinWindow(input: {
    localDate: LocalDate;
    validFrom?: LocalDate | null;
    validUntil?: LocalDate | null;
  }): boolean {
    const { localDate, validFrom, validUntil } = input;

    if (validFrom && localDate < validFrom) {
      return false;
    }

    if (validUntil && localDate > validUntil) {
      return false;
    }

    return true;
  }
}
