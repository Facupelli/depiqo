import { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';
import { Result, err, ok } from 'neverthrow';

import { V2ContractsPublicApi } from 'src/modules/contracts/public-api/contracts.public-api';

import { PublicSigningDocumentStream } from '../document-signing-public-document-stream.contract';
import { publicSigningSessionError, PublicSigningSessionError } from '../public-signing-session.errors';
import { PublicSigningSessionLoader } from '../public-signing-session.loader';

@Injectable()
export class StreamPublicSignedDocumentService {
  constructor(
    private readonly publicSigningSessionLoader: PublicSigningSessionLoader,
    private readonly contractsPublicApi: V2ContractsPublicApi,
  ) {}

  async stream(rawToken: string): Promise<Result<PublicSigningDocumentStream, PublicSigningSessionError>> {
    const requestResult = await this.publicSigningSessionLoader.loadRequiredSignedPublicSession(rawToken);
    if (requestResult.isErr()) {
      return err(requestResult.error);
    }

    const request = requestResult.value;
    const signatureImageDataUrl = request.currentSignatureImageDataUrl;
    const signedAt = request.signedOn;

    if (!signatureImageDataUrl || !signedAt) {
      throw new Error(`Signed document signing request '${request.id}' is missing signature data.`);
    }

    const result = await this.contractsPublicApi.renderSignedRentalRemito({
      tenantId: request.tenantId,
      rentalId: request.orderId,
      signatureImageDataUrl,
      signerEmail: request.currentRecipientEmail,
      signedAt,
      signingRequestId: request.id,
    });

    if (result.isErr()) {
      return err(translateSignedDocumentDependencyError(result.error, request.orderId));
    }

    return ok({
      fileName: `${result.value.fileName}.pdf`,
      contentType: 'application/pdf',
      contentLength: result.value.buffer.byteLength,
      stream: Readable.from(result.value.buffer),
    });
  }
}

function translateSignedDocumentDependencyError(
  error: { code: string; message: string; cause?: unknown },
  orderId: string,
): PublicSigningSessionError {
  switch (error.code) {
    case 'CustomerProfileMissing':
      return publicSigningSessionError('document_signing.customer_profile_missing', error.message, error, { orderId });
    case 'RentalNotFound':
      return publicSigningSessionError('document_signing.order_not_found', `Order '${orderId}' was not found.`, error, {
        orderId,
      });
    default:
      throw error;
  }
}
