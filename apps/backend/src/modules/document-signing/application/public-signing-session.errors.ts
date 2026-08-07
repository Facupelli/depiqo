import { ApplicationError } from 'src/core/errors/application-error';

export type PublicSigningSessionErrorCode =
  | 'document_signing.signing_token_not_found'
  | 'document_signing.signing_request_expired'
  | 'document_signing.signing_request_unavailable'
  | 'document_signing.signing_request_conflict'
  | 'document_signing.receipt_token_not_found'
  | 'document_signing.receipt_token_expired'
  | 'document_signing.signed_document_unavailable'
  | 'document_signing.customer_profile_missing'
  | 'document_signing.order_not_found';

export interface PublicSigningSessionError extends ApplicationError {
  code: PublicSigningSessionErrorCode;
}

export function publicSigningSessionError(
  code: PublicSigningSessionErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): PublicSigningSessionError {
  return { code, message, cause, context };
}
