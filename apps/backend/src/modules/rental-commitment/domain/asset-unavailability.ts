import { err, ok, Result } from 'neverthrow';

export interface UnavailabilityWindow {
  startsAt: Date;
  endsAt: Date;
  reason: string;
}

export interface AssetUnavailability extends UnavailabilityWindow {
  cancelledAt: Date | null;
}

export function scheduleUnavailability(
  window: UnavailabilityWindow,
  now: Date,
): Result<AssetUnavailability, 'invalid_window'> {
  const { startsAt, endsAt } = window;
  const reason = window.reason.trim();
  if (!(startsAt >= now && endsAt > startsAt && reason.length > 0 && reason.length <= 500)) {
    return err('invalid_window');
  }
  return ok({ startsAt, endsAt, reason, cancelledAt: null });
}

export function rescheduleUnavailability(
  current: AssetUnavailability,
  window: UnavailabilityWindow,
  now: Date,
): Result<AssetUnavailability, 'invalid_window' | 'not_editable'> {
  if (current.cancelledAt || current.endsAt <= now) return err('not_editable');
  if (current.startsAt > now) return scheduleUnavailability(window, now);

  if (window.startsAt.getTime() !== current.startsAt.getTime() || window.reason.trim() !== current.reason) {
    return err('not_editable');
  }
  if (!(window.endsAt > now)) return err('invalid_window');
  return ok({ ...current, endsAt: window.endsAt });
}

export function cancelUnavailability(
  current: AssetUnavailability,
  now: Date,
): Result<AssetUnavailability, 'not_editable'> {
  if (current.cancelledAt) return ok(current);
  if (current.endsAt <= now) return err('not_editable');
  if (current.startsAt >= now) return ok({ ...current, cancelledAt: now });
  return ok({ ...current, endsAt: now });
}
