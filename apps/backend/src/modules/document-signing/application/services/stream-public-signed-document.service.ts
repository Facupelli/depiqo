import { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { ContractCustomerProfileMissingError } from 'src/modules/order/domain/errors/contract.errors';
import { OrderNotFoundError } from 'src/modules/order/domain/errors/order.errors';
import { PrepareSignedOrderAgreementForSigningQuery } from 'src/modules/order/public/queries/prepare-signed-order-agreement-for-signing.query';
import { RenderedOrderAgreementReadModel } from 'src/modules/order/public/read-models/rendered-order-agreement.read-model';

import { PublicSigningDocumentStream } from '../document-signing-public-document-stream.contract';
import { PublicSigningSessionLoader } from '../public-signing-session.loader';

type PrepareSignedOrderAgreementForSigningResult = Result<
  RenderedOrderAgreementReadModel,
  ContractCustomerProfileMissingError | OrderNotFoundError
>;

@Injectable()
export class StreamPublicSignedDocumentService {
  constructor(
    private readonly publicSigningSessionLoader: PublicSigningSessionLoader,
    private readonly queryBus: QueryBus,
  ) {}

  async stream(rawToken: string): Promise<PublicSigningDocumentStream> {
    const request = await this.publicSigningSessionLoader.loadRequiredSignedPublicSession(rawToken);
    const signatureImageDataUrl = request.currentSignatureImageDataUrl;
    const signedAt = request.signedOn;

    if (!signatureImageDataUrl || !signedAt) {
      throw new Error(`Signed document signing request '${request.id}' is missing signature data.`);
    }

    const result = await this.queryBus.execute<
      PrepareSignedOrderAgreementForSigningQuery,
      PrepareSignedOrderAgreementForSigningResult
    >(
      new PrepareSignedOrderAgreementForSigningQuery(
        request.tenantId,
        request.orderId,
        signatureImageDataUrl,
        request.currentRecipientEmail,
        signedAt,
        request.id,
      ),
    );

    if (result.isErr()) {
      throw result.error;
    }

    return {
      fileName: `${result.value.fileName}.pdf`,
      contentType: 'application/pdf',
      contentLength: result.value.buffer.byteLength,
      stream: Readable.from(result.value.buffer),
    };
  }
}
