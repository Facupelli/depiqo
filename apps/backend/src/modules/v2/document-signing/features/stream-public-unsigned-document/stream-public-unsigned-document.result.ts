import { Readable } from 'node:stream';

export interface StreamPublicUnsignedDocumentResult {
  stream: Readable;
  fileName: string;
  contentType: string;
  byteSize: number;
}
