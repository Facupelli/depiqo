import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { PublicSigningSessionLoader } from '../../application/public-signing-session.loader';
import { PublicSigningSessionError } from '../../application/public-signing-session.errors';
import { PublicSigningSessionReadModel } from './get-public-signing-session.contract';
import { GetPublicSigningSessionQuery } from './get-public-signing-session.query';

@QueryHandler(GetPublicSigningSessionQuery)
export class GetPublicSigningSessionQueryHandler implements IQueryHandler<
  GetPublicSigningSessionQuery,
  Result<PublicSigningSessionReadModel, PublicSigningSessionError>
> {
  constructor(private readonly publicSigningSessionLoader: PublicSigningSessionLoader) {}

  async execute(
    query: GetPublicSigningSessionQuery,
  ): Promise<Result<PublicSigningSessionReadModel, PublicSigningSessionError>> {
    const requestResult = await this.publicSigningSessionLoader.loadRequiredPublicSession(query.rawToken);
    if (requestResult.isErr()) {
      return err(requestResult.error);
    }

    const request = requestResult.value;

    return ok({
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
    });
  }
}
