import { DomainException } from 'src/core/exceptions/domain.exception';

import { RentalPeriod } from './value-objects/rental-period.value-object';

const MILLISECONDS_PER_MINUTE = 60_000;

export function deriveAssetBlockPeriod(params: {
  participationPeriod: RentalPeriod;
  beforeBufferMinutes: number;
  afterBufferMinutes: number;
  operationTime?: Date;
}): RentalPeriod {
  validateBufferMinutes('beforeBufferMinutes', params.beforeBufferMinutes);
  validateBufferMinutes('afterBufferMinutes', params.afterBufferMinutes);

  if (
    params.operationTime !== undefined &&
    (!(params.operationTime instanceof Date) || Number.isNaN(params.operationTime.getTime()))
  ) {
    throw new DomainException('Asset block operationTime must be a valid date.');
  }

  const bufferedStart = new Date(
    params.participationPeriod.start.getTime() - params.beforeBufferMinutes * MILLISECONDS_PER_MINUTE,
  );
  const bufferedEnd = new Date(
    params.participationPeriod.end.getTime() + params.afterBufferMinutes * MILLISECONDS_PER_MINUTE,
  );

  if (Number.isNaN(bufferedStart.getTime()) || Number.isNaN(bufferedEnd.getTime())) {
    throw new DomainException('Asset block buffer duration produces an invalid period.');
  }

  const blockStart =
    params.operationTime !== undefined && params.operationTime >= params.participationPeriod.start
      ? params.operationTime
      : bufferedStart;

  return new RentalPeriod(blockStart, bufferedEnd);
}

function validateBufferMinutes(field: string, value: number): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new DomainException(`Asset block ${field} must be a finite, non-negative integer.`);
  }
}
