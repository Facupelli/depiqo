import { DocumentSigningRequestStatus } from 'src/generated/prisma/client';
import {
  DocumentSigningRequestStatusTransitionNotAllowedError,
  DocumentSigningRequestExpiredError,
  DocumentSigningRequestTokenNotFoundError,
  DocumentSigningRequestUnavailableError,
  SigningAcceptanceConfirmationRequiredError,
  SigningAcceptanceIdentityRequiredError,
} from 'src/modules/document-signing/domain/errors/document-signing.errors';

export interface AcceptPublicSigningInput {
  rawToken: string;
  signatureImageDataUrl: string;
  acceptanceTextVersion: string;
  accepted: boolean;
}

export interface AcceptPublicSigningResult {
  requestId: string;
  status: typeof DocumentSigningRequestStatus.SIGNED;
  signedAt: Date;
}

export type AcceptPublicSigningError =
  | DocumentSigningRequestStatusTransitionNotAllowedError
  | SigningAcceptanceConfirmationRequiredError
  | SigningAcceptanceIdentityRequiredError
  | DocumentSigningRequestExpiredError
  | DocumentSigningRequestTokenNotFoundError
  | DocumentSigningRequestUnavailableError;
