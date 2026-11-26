import { ApplicationError } from 'src/core/errors/application-error';

export type AssetUnavailabilityErrorCode =
  | 'asset_inventory.asset_not_found'
  | 'asset_unavailability.period_not_found'
  | 'asset_unavailability.invalid_window'
  | 'asset_unavailability.not_editable'
  | 'asset_unavailability.overlap';

export interface AssetUnavailabilityError extends ApplicationError {
  code: AssetUnavailabilityErrorCode;
}

const messages = {
  'asset_inventory.asset_not_found': 'The requested asset could not be found.',
  'asset_unavailability.period_not_found': 'The requested unavailability period could not be found.',
  'asset_unavailability.invalid_window': 'Provide a valid period with a future end and a reason.',
  'asset_unavailability.not_editable': 'This change would modify completed, cancelled, or elapsed unavailability.',
  'asset_unavailability.overlap': 'The asset already has a reservation or unavailability period at the requested time.',
} satisfies Record<AssetUnavailabilityErrorCode, string>;

export function assetUnavailabilityError(
  code: AssetUnavailabilityErrorCode,
  cause?: unknown,
): AssetUnavailabilityError {
  return { code, message: messages[code], cause };
}
