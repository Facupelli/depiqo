import { Injectable } from '@nestjs/common';

import { PublicSigningDocumentStream } from '../document-signing-public-document-stream.contract';
import { PublicSigningSessionLoader } from '../public-signing-session.loader';
import { SigningRequestPdfStorageService } from './signing-request-pdf-storage.service';

@Injectable()
export class StreamPublicUnsignedDocumentService {
  constructor(
    private readonly publicSigningSessionLoader: PublicSigningSessionLoader,
    private readonly signingRequestPdfStorageService: SigningRequestPdfStorageService,
  ) {}

  async stream(rawToken: string): Promise<PublicSigningDocumentStream> {
    const request = await this.publicSigningSessionLoader.loadRequiredPublicSession(rawToken);
    const stream = await this.signingRequestPdfStorageService.streamUnsignedPdf(request.currentPdfStorageKey);

    return {
      fileName: request.currentPdfFileName,
      contentType: request.currentPdfContentType,
      contentLength: request.currentPdfByteSize,
      stream,
    };
  }
}
