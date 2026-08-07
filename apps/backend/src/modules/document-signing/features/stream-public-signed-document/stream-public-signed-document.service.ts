import { Injectable } from '@nestjs/common';
import { Result, err, ok } from 'neverthrow';

import { V2ContractsPublicApi } from 'src/modules/contracts/public-api/contracts.public-api';

import { PublicSigningDocumentStream } from '../../application/document-signing-public-document-stream.contract';
import { publicSigningSessionError, PublicSigningSessionError } from '../../application/public-signing-session.errors';

@Injectable()
export class StreamPublicSignedDocumentService {
  constructor(private readonly contracts: V2ContractsPublicApi) {}

  async stream(rawReceiptToken: string): Promise<Result<PublicSigningDocumentStream, PublicSigningSessionError>> {
    const result = await this.contracts.streamPublicRentalRemitoSignedArtifact(rawReceiptToken);
    if (result.isErr()) return err(toPublicSigningSessionError(result.error));

    return ok({
      fileName: result.value.fileName,
      contentType: result.value.contentType,
      contentLength: result.value.byteSize,
      stream: result.value.stream,
    });
  }
}

function toPublicSigningSessionError(error: {
  code: 'ReceiptTokenNotFound' | 'ReceiptTokenExpired' | 'ReceiptTokenUnavailable';
  message: string;
}): PublicSigningSessionError {
  switch (error.code) {
    case 'ReceiptTokenNotFound':
      return publicSigningSessionError('document_signing.receipt_token_not_found', error.message, error);
    case 'ReceiptTokenExpired':
      return publicSigningSessionError('document_signing.receipt_token_expired', error.message, error);
    case 'ReceiptTokenUnavailable':
      return publicSigningSessionError('document_signing.signed_document_unavailable', error.message, error);
  }
}
