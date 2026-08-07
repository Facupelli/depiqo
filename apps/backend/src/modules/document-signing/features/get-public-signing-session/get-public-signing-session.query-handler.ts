import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { PublicV2SigningSessionLoader } from '../../application/public-v2-signing-session.loader';
import { PublicSigningSessionError } from '../../application/public-signing-session.errors';
import { PublicSigningSessionReadModel } from './get-public-signing-session.contract';
import {
  getPublicSigningSessionError,
  GetPublicSigningSessionError,
  GetPublicSigningSessionErrorCode,
} from './get-public-signing-session.errors';
import { GetPublicSigningSessionQuery } from './get-public-signing-session.query';

@QueryHandler(GetPublicSigningSessionQuery)
export class GetPublicSigningSessionQueryHandler implements IQueryHandler<
  GetPublicSigningSessionQuery,
  Result<PublicSigningSessionReadModel, GetPublicSigningSessionError>
> {
  constructor(private readonly publicSigningSessionLoader: PublicV2SigningSessionLoader) {}

  async execute(
    query: GetPublicSigningSessionQuery,
  ): Promise<Result<PublicSigningSessionReadModel, GetPublicSigningSessionError>> {
    const requestResult = await this.publicSigningSessionLoader.loadRequiredPublicSession(query.rawToken);
    if (requestResult.isErr()) {
      const code = getPublicSigningSessionErrorCodeMap[requestResult.error.code];

      if (!code) {
        throwUnexpectedPublicSigningSessionError(requestResult.error);
      }

      return err(
        getPublicSigningSessionError(code, requestResult.error.message, requestResult.error, {
          useCase: 'GetPublicSigningSession',
        }),
      );
    }

    const request = requestResult.value;

    return ok({
      requestId: request.requestId,
      documentType: 'RENTAL_AGREEMENT',
      status: request.status,
      expiresAt: request.expiresAt,
      document: {
        documentNumber: request.documentNumber,
        displayFileName: request.unsignedArtifact.fileName,
        contentType: request.unsignedArtifact.contentType,
        byteSize: request.unsignedArtifact.byteSize,
        sha256: request.unsignedArtifact.documentHash,
      },
      prefilledSigner: {
        fullName: request.signerName,
        documentNumber: null,
      },
    });
  }
}

const getPublicSigningSessionErrorCodeMap: Partial<
  Record<PublicSigningSessionError['code'], GetPublicSigningSessionErrorCode>
> = {
  'document_signing.signing_token_not_found': 'document_signing.signing_token_not_found',
  'document_signing.signing_request_expired': 'document_signing.signing_request_expired',
  'document_signing.signing_request_unavailable': 'document_signing.signing_request_unavailable',
  'document_signing.signing_request_conflict': 'document_signing.signing_request_conflict',
};

function throwUnexpectedPublicSigningSessionError(error: PublicSigningSessionError): never {
  if (error.cause instanceof Error) {
    throw error.cause;
  }

  throw new Error(error.message, { cause: error.cause });
}
