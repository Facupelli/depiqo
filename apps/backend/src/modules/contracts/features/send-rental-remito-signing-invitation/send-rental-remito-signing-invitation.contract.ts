import { SigningDocumentType } from 'src/generated/prisma/client';

export interface SendRentalRemitoSigningInvitationInput {
  tenantId: string;
  orderId: string;
  documentType: SigningDocumentType;
  recipientEmail?: string | null;
}

export interface SendRentalRemitoSigningInvitationResult {
  requestId: string;
  documentNumber: string;
  recipientEmail: string;
  expiresAt: Date;
  documentHash: string;
  reusedExistingRequest: boolean;
}
