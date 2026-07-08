export class GetLatestSignedOrderSigningRequestQuery {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
  ) {}
}

export interface SignedOrderSigningRequestReadModel {
  requestId: string;
  tenantId: string;
  orderId: string;
  signatureImageDataUrl: string;
  recipientEmail: string;
  signedAt: Date;
}
