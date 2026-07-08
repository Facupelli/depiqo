import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PublicSigningSessionLoader } from '../../public-signing-session.loader';
import { PublicSigningSessionReadModel } from './get-public-signing-session.contract';
import { GetPublicSigningSessionQuery } from './get-public-signing-session.query';

@QueryHandler(GetPublicSigningSessionQuery)
export class GetPublicSigningSessionQueryHandler implements IQueryHandler<
  GetPublicSigningSessionQuery,
  PublicSigningSessionReadModel
> {
  constructor(private readonly publicSigningSessionLoader: PublicSigningSessionLoader) {}

  async execute(query: GetPublicSigningSessionQuery): Promise<PublicSigningSessionReadModel> {
    const request = await this.publicSigningSessionLoader.loadRequiredPublicSession(query.rawToken);

    return {
      requestId: request.id,
      documentType: request.documentType,
      status: request.currentStatus,
      expiresAt: request.expiresOn,
      document: {
        documentNumber: request.documentNumber,
        displayFileName: request.currentPdfFileName,
        contentType: request.currentPdfContentType,
        byteSize: request.currentPdfByteSize,
        sha256: request.documentHash,
      },
      prefilledSigner: {
        fullName: request.currentSignerFullName,
        documentNumber: request.currentSignerDocumentNumber,
      },
    };
  }
}
