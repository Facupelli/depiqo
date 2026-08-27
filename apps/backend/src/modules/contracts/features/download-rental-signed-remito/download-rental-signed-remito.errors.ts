import { ApplicationError } from 'src/core/errors/application-error';

export type DownloadRentalSignedRemitoErrorCode =
  | 'contracts.signed_remito_not_found'
  | 'contracts.signed_remito_unavailable';

export interface DownloadRentalSignedRemitoError extends ApplicationError {
  code: DownloadRentalSignedRemitoErrorCode;
}

export function downloadRentalSignedRemitoError(
  code: DownloadRentalSignedRemitoErrorCode,
  message: string,
  context?: Record<string, unknown>,
): DownloadRentalSignedRemitoError {
  return { code, message, context };
}
