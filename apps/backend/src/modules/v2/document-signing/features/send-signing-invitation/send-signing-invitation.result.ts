import { SigningDocumentType } from 'src/generated/prisma/client';

export interface SendSigningInvitationInput {
  tenantId: string;
  orderId: string;
  documentType: SigningDocumentType;
  recipientEmail?: string | null;
}

export interface SendSigningInvitationResult {
  requestId: string;
  documentNumber: string;
  recipientEmail: string;
  expiresAt: Date;
  documentHash: string;
  reusedExistingRequest: boolean;
}
