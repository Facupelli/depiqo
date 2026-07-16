import { ApplicationError } from 'src/core/errors/application-error';

export type SendSigningInvitationErrorCode =
  | 'document_signing.order_not_found'
  | 'document_signing.order_not_ready'
  | 'document_signing.customer_profile_missing'
  | 'document_signing.recipient_email_required'
  | 'document_signing.invitation_delivery_failed'
  | 'document_signing.signing_request_conflict';

export interface SendSigningInvitationError extends ApplicationError {
  code: SendSigningInvitationErrorCode;
}

export function sendSigningInvitationError(
  code: SendSigningInvitationErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): SendSigningInvitationError {
  return { code, message, cause, context };
}
