// apps/backend/src/modules/document-signing/features/stream-public-unsigned-document/stream-public-unsigned-document.service.ts

import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { V2DocumentSigningRequestStatus } from 'src/generated/prisma/enums';

import {
  PublicSigningSessionLoader,
  PublicSigningSessionLoaderError,
} from '../../application/public-signing-session.loader';
import { SigningPdfStorageService } from '../../application/signing-pdf-storage.service';
import { StreamPublicUnsignedDocumentResult } from './stream-public-unsigned-document.result';
import { StreamPublicUnsignedDocumentQuery } from './stream-public-unsigned-document.query';

export type StreamPublicUnsignedDocumentQueryError = PublicSigningSessionLoaderError;

@Injectable()
@QueryHandler(StreamPublicUnsignedDocumentQuery)
export class StreamPublicUnsignedDocumentService implements IQueryHandler<
  StreamPublicUnsignedDocumentQuery,
  Result<StreamPublicUnsignedDocumentResult, StreamPublicUnsignedDocumentQueryError>
> {
  constructor(
    private readonly publicSigningSessionLoader: PublicSigningSessionLoader,
    private readonly signingPdfStorageService: SigningPdfStorageService,
  ) {}

  async execute(
    query: StreamPublicUnsignedDocumentQuery,
  ): Promise<Result<StreamPublicUnsignedDocumentResult, StreamPublicUnsignedDocumentQueryError>> {
    const sessionResult = await this.publicSigningSessionLoader.load({
      rawToken: query.rawToken,
      allowedStatuses: [V2DocumentSigningRequestStatus.SENT, V2DocumentSigningRequestStatus.VIEWED],
      markViewed: true,
    });

    if (sessionResult.isErr()) {
      return err(sessionResult.error);
    }

    const session = sessionResult.value;
    const stream = await this.signingPdfStorageService.streamPdf(session.unsignedArtifact.storageKey);

    return ok({
      stream,
      fileName: session.unsignedArtifact.fileName,
      contentType: session.unsignedArtifact.contentType,
      byteSize: session.unsignedArtifact.byteSize,
    });
  }
}
