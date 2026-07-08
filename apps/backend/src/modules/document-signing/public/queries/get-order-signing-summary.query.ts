export const DocumentSigningPublicDocumentTypes = {
  RENTAL_AGREEMENT: 'RENTAL_AGREEMENT',
} as const;

export type DocumentSigningPublicDocumentType =
  (typeof DocumentSigningPublicDocumentTypes)[keyof typeof DocumentSigningPublicDocumentTypes];

export type OrderSigningSummaryStatus = 'NO_REQUEST' | 'PENDING' | 'SIGNED' | 'EXPIRED' | 'VOIDED';

export type OrderSigningSummaryReadModel = {
  status: OrderSigningSummaryStatus;
  documentType: DocumentSigningPublicDocumentType | null;
  recipientEmail: string | null;
  createdAt: Date | null;
  expiresAt: Date | null;
  signedAt: Date | null;
};

export class GetOrderSigningSummaryQuery {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly documentType: DocumentSigningPublicDocumentType,
  ) {}
}
