import { Readable } from 'node:stream';

export interface PutObjectInput {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface GetObjectInput {
  key: string;
}

export interface DeleteObjectInput {
  key: string;
}

export abstract class ObjectStoragePort {
  abstract putObject(input: PutObjectInput): Promise<void>;
  abstract getObjectBuffer(input: GetObjectInput): Promise<Buffer>;
  abstract getObjectStream(input: GetObjectInput): Promise<Readable>;
  abstract deleteObject(input: DeleteObjectInput): Promise<void>;
}
