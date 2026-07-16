import { ApplicationError } from 'src/core/errors/application-error';

export type AcceptPublicSigningSessionErrorCode =
  | 'document_signing.signing_token_not_found'
  | 'document_signing.signing_request_expired'
  | 'document_signing.signing_request_unavailable'
  | 'document_signing.signing_request_conflict'
  | 'document_signing.acceptance_confirmation_required'
  | 'document_signing.signing_identity_required';

export interface AcceptPublicSigningSessionError extends ApplicationError {
  code: AcceptPublicSigningSessionErrorCode;
}

export function acceptPublicSigningSessionError(
  code: AcceptPublicSigningSessionErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): AcceptPublicSigningSessionError {
  return { code, message, cause, context };
}
