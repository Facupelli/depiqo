import { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';

import { SigningDocumentType } from 'src/generated/prisma/client';
import { ObjectStoragePort } from 'src/modules/object-storage/application/ports/object-storage.port';

export interface StoreSigningRequestPdfInput {
  tenantId: string;
  orderId: string;
  requestId: string;
  documentType: SigningDocumentType;
  documentHash: string;
  fileName: string;
  buffer: Buffer;
}

export interface StoredSigningRequestPdf {
  storageKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
}

@Injectable()
export class SigningRequestPdfStorageService {
  private static readonly contentType = 'application/pdf';

  constructor(private readonly objectStorage: ObjectStoragePort) {}

  async storeUnsignedPdf(input: StoreSigningRequestPdfInput): Promise<StoredSigningRequestPdf> {
    const storageKey = this.buildUnsignedPdfKey(input.tenantId, input.orderId, input.requestId);

    await this.objectStorage.putObject({
      key: storageKey,
      body: input.buffer,
      contentType: SigningRequestPdfStorageService.contentType,
      metadata: {
        tenantId: input.tenantId,
        orderId: input.orderId,
        requestId: input.requestId,
        documentType: input.documentType,
        documentHash: input.documentHash,
      },
    });

    return {
      storageKey,
      fileName: input.fileName,
      contentType: SigningRequestPdfStorageService.contentType,
      byteSize: input.buffer.byteLength,
    };
  }

  streamUnsignedPdf(storageKey: string): Promise<Readable> {
    return this.objectStorage.getObjectStream({ key: storageKey });
  }

  private buildUnsignedPdfKey(tenantId: string, orderId: string, requestId: string): string {
    return `${tenantId}/${orderId}/${requestId}/unsigned.pdf`;
  }
}
