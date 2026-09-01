import { isValidBufferMinutes } from 'src/core/domain/rental-asset-buffer';
import { DomainException } from 'src/core/exceptions/domain.exception';

import { RentalPeriod } from './value-objects/rental-period.value-object';

const MILLISECONDS_PER_MINUTE = 60_000;

export function deriveBufferedAssetBlockPeriod(params: {
  participationPeriod: RentalPeriod;
  beforeBufferMinutes: number;
  afterBufferMinutes: number;
  clampStartAt?: Date;
}): RentalPeriod {
  if (!isValidBufferMinutes(params.beforeBufferMinutes)) {
    throw new DomainException('Asset block beforeBufferMinutes must be a finite, non-negative integer.');
  }
  if (!isValidBufferMinutes(params.afterBufferMinutes)) {
    throw new DomainException('Asset block afterBufferMinutes must be a finite, non-negative integer.');
  }

  if (
    params.clampStartAt !== undefined &&
    (!(params.clampStartAt instanceof Date) || Number.isNaN(params.clampStartAt.getTime()))
  ) {
    throw new DomainException('Asset block clampStartAt must be a valid date.');
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
    params.clampStartAt !== undefined && params.clampStartAt >= params.participationPeriod.start
      ? params.clampStartAt
      : bufferedStart;

  return new RentalPeriod(blockStart, bufferedEnd);
}
