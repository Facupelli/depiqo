import { Readable } from 'node:stream';

export interface StreamPublicSignedReceiptDocumentResult {
  stream: Readable;
  fileName: string;
  contentType: string;
  byteSize: number;
}
