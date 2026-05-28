import { DomainException } from 'src/core/exceptions/domain.exception';

export class RentalPeriod {
  private readonly startDate: Date;
  private readonly endDate: Date;

  constructor(start: Date, end: Date) {
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
      throw new DomainException('RentalPeriod start must be a valid date.');
    }
    if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
      throw new DomainException('RentalPeriod end must be a valid date.');
    }
    if (end <= start) {
      throw new DomainException('RentalPeriod end must be after start.');
    }

    this.startDate = new Date(start);
    this.endDate = new Date(end);
  }

  get start(): Date {
    return new Date(this.startDate);
  }

  get end(): Date {
    return new Date(this.endDate);
  }

  overlaps(other: RentalPeriod): boolean {
    return this.startDate < other.endDate && this.endDate > other.startDate;
  }

  equals(other: RentalPeriod): boolean {
    return this.startDate.getTime() === other.startDate.getTime() && this.endDate.getTime() === other.endDate.getTime();
  }

  toPostgresRange(): string {
    return `[${this.startDate.toISOString()},${this.endDate.toISOString()})`;
  }
}
