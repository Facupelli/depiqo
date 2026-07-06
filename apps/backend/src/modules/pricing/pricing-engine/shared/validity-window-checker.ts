export class ValidityWindowChecker {
  isWithinWindow(input: { date: Date; validFrom?: Date | null; validUntil?: Date | null }): boolean {
    const { date, validFrom, validUntil } = input;

    if (validFrom && date < validFrom) {
      return false;
    }

    if (validUntil && date > validUntil) {
      return false;
    }

    return true;
  }
}
