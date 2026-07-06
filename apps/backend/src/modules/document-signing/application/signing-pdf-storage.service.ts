import { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';

import { ObjectStoragePort } from 'src/modules/object-storage/application/ports/object-storage.port';

export interface StoreUnsignedSigningPdfInput {
  tenantId: string;
  contractId: string;
  rentalId: string;
  artifactId: string;
  documentHash: string;
  fileName: string;
  buffer: Buffer;
}

export interface StoreSignedSigningPdfInput {
  tenantId: string;
  contractId: string;
  rentalId: string;
  artifactId: string;
  documentHash: string;
  fileName: string;
  buffer: Buffer;
}

export interface StoredSigningPdf {
  storageKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
}

@Injectable()
export class SigningPdfStorageService {
  private static readonly contentType = 'application/pdf';

  constructor(private readonly objectStorage: ObjectStoragePort) {}

  async storeUnsignedPdf(input: StoreUnsignedSigningPdfInput): Promise<StoredSigningPdf> {
    const storageKey = this.buildUnsignedPdfKey(input.tenantId, input.contractId, input.artifactId);

    await this.objectStorage.putObject({
      key: storageKey,
      body: input.buffer,
      contentType: SigningPdfStorageService.contentType,
      metadata: {
        tenantId: input.tenantId,
        contractId: input.contractId,
        rentalId: input.rentalId,
        artifactId: input.artifactId,
        documentHash: input.documentHash,
        artifactKind: 'UNSIGNED_PDF',
      },
    });

    return {
      storageKey,
      fileName: input.fileName,
      contentType: SigningPdfStorageService.contentType,
      byteSize: input.buffer.byteLength,
    };
  }

  async storeSignedPdf(input: StoreSignedSigningPdfInput): Promise<StoredSigningPdf> {
    const storageKey = this.buildSignedPdfKey(input.tenantId, input.contractId, input.artifactId);

    await this.objectStorage.putObject({
      key: storageKey,
      body: input.buffer,
      contentType: SigningPdfStorageService.contentType,
      metadata: {
        tenantId: input.tenantId,
        contractId: input.contractId,
        rentalId: input.rentalId,
        artifactId: input.artifactId,
        documentHash: input.documentHash,
        artifactKind: 'SIGNED_PDF',
      },
    });

    return {
      storageKey,
      fileName: input.fileName,
      contentType: SigningPdfStorageService.contentType,
      byteSize: input.buffer.byteLength,
    };
  }

  streamPdf(storageKey: string): Promise<Readable> {
    return this.objectStorage.getObjectStream({ key: storageKey });
  }

  private buildUnsignedPdfKey(tenantId: string, contractId: string, artifactId: string): string {
    return `tenants/${tenantId}/contracts/${contractId}/artifacts/${artifactId}/unsigned.pdf`;
  }

  private buildSignedPdfKey(tenantId: string, contractId: string, artifactId: string): string {
    return `tenants/${tenantId}/contracts/${contractId}/artifacts/${artifactId}/signed.pdf`;
  }
}
