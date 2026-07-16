import { Injectable } from '@nestjs/common';
import { Result, err, ok } from 'neverthrow';

import { PublicSigningDocumentStream } from '../document-signing-public-document-stream.contract';
import { PublicSigningSessionError } from '../public-signing-session.errors';
import { PublicSigningSessionLoader } from '../public-signing-session.loader';
import { SigningRequestPdfStorageService } from './signing-request-pdf-storage.service';

@Injectable()
export class StreamPublicUnsignedDocumentService {
  constructor(
    private readonly publicSigningSessionLoader: PublicSigningSessionLoader,
    private readonly signingRequestPdfStorageService: SigningRequestPdfStorageService,
  ) {}

  async stream(rawToken: string): Promise<Result<PublicSigningDocumentStream, PublicSigningSessionError>> {
    const requestResult = await this.publicSigningSessionLoader.loadRequiredPublicSession(rawToken);
    if (requestResult.isErr()) {
      return err(requestResult.error);
    }

    const request = requestResult.value;
    const stream = await this.signingRequestPdfStorageService.streamUnsignedPdf(request.currentPdfStorageKey);

    return ok({
      fileName: request.currentPdfFileName,
      contentType: request.currentPdfContentType,
      contentLength: request.currentPdfByteSize,
      stream,
    });
  }
}
