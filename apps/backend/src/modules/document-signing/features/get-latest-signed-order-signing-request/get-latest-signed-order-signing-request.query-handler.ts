import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { SigningDocumentType } from 'src/generated/prisma/client';
import { DocumentSigningRequestRepository } from 'src/modules/document-signing/infrastructure/persistence/repositories/document-signing-request.repository';
import {
  GetLatestSignedOrderSigningRequestQuery,
  SignedOrderSigningRequestReadModel,
} from 'src/modules/document-signing/public/queries/get-latest-signed-order-signing-request.query';

@QueryHandler(GetLatestSignedOrderSigningRequestQuery)
export class GetLatestSignedOrderSigningRequestQueryHandler implements IQueryHandler<
  GetLatestSignedOrderSigningRequestQuery,
  SignedOrderSigningRequestReadModel | null
> {
  constructor(private readonly documentSigningRequestRepository: DocumentSigningRequestRepository) {}

  async execute(query: GetLatestSignedOrderSigningRequestQuery): Promise<SignedOrderSigningRequestReadModel | null> {
    const request = await this.documentSigningRequestRepository.findLatestSignedForOrderDocument(
      query.tenantId,
      query.orderId,
      SigningDocumentType.RENTAL_AGREEMENT,
    );
    const signatureImageDataUrl = request?.currentSignatureImageDataUrl;
    const signedAt = request?.signedOn;

    if (!request || !signatureImageDataUrl || !signedAt) {
      return null;
    }

    return {
      requestId: request.id,
      tenantId: request.tenantId,
      orderId: request.orderId,
      signatureImageDataUrl,
      recipientEmail: request.currentRecipientEmail,
      signedAt,
    };
  }
}
