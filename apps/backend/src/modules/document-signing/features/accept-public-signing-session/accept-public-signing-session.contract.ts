import { DocumentSigningRequestStatus } from 'src/generated/prisma/client';
import { AcceptPublicSigningSessionError } from './accept-public-signing-session.errors';

export interface AcceptPublicSigningInput {
  rawToken: string;
  signatureImageDataUrl: string;
  acceptanceTextVersion: string;
  accepted: boolean;
}

export interface AcceptPublicSigningResult {
  requestId: string;
  status: typeof DocumentSigningRequestStatus.SIGNED;
  signedAt: string;
  downloadUrl: string;
  receiptTokenExpiresAt: string;
}

export type AcceptPublicSigningError = AcceptPublicSigningSessionError;
