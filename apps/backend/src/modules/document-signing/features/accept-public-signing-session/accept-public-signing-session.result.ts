export interface AcceptPublicSigningSessionResult {
  requestId: string;
  status: 'SIGNED';
  signedAt: Date;
  downloadUrl: string;
  receiptTokenExpiresAt: Date;
}
