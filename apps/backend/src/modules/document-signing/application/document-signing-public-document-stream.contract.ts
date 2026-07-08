import { Readable } from 'stream';

export interface PublicSigningDocumentStream {
  fileName: string;
  contentType: string;
  contentLength: number;
  stream: Readable;
}
