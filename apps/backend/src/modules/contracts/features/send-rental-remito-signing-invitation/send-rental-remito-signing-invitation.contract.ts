export interface SendRentalRemitoSigningInvitationInput {
  tenantId: string;
  orderId: string;
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
