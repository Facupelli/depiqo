import { ApplicationError } from 'src/core/errors/application-error';

export type GetPublicSigningSessionErrorCode =
  | 'document_signing.signing_token_not_found'
  | 'document_signing.signing_request_expired'
  | 'document_signing.signing_request_unavailable'
  | 'document_signing.signing_request_conflict';

export interface GetPublicSigningSessionError extends ApplicationError {
  code: GetPublicSigningSessionErrorCode;
}

export function getPublicSigningSessionError(
  code: GetPublicSigningSessionErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): GetPublicSigningSessionError {
  return { code, message, cause, context };
}
