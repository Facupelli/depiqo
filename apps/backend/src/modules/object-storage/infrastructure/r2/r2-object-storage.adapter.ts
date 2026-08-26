import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from 'src/config/env.schema';
import { ObjectStorageProviderError } from '../../application/errors/object-storage-provider.error';
import {
  DeleteObjectInput,
  GetObjectInput,
  ObjectStoragePort,
  PutObjectInput,
} from '../../application/ports/object-storage.port';

interface BodyWithByteArray {
  transformToByteArray(): Promise<Uint8Array>;
}

interface BodyWithWebStream {
  transformToWebStream(): ReadableStream;
}

@Injectable()
export class R2ObjectStorageAdapter extends ObjectStoragePort {
  private static readonly providerName = 'R2';
  private readonly bucketName: string;
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService<Env, true>) {
    super();

    const accountId = this.configService.get('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId = this.configService.get('R2_SIGNING_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('R2_SIGNING_SECRET_ACCESS_KEY');

    this.bucketName = this.configService.get('R2_SIGNING_BUCKET_NAME');
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async putObject(input: PutObjectInput): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          Metadata: input.metadata,
        }),
      );
    } catch (error) {
      throw this.wrapProviderError('putObject', input.key, error);
    }
  }

  async deleteObject(input: DeleteObjectInput): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: input.key,
        }),
      );
    } catch (error) {
      throw this.wrapProviderError('deleteObject', input.key, error);
    }
  }

  async getObjectBuffer(input: GetObjectInput): Promise<Buffer> {
    let response;
    try {
      response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: input.key,
        }),
      );
    } catch (error) {
      throw this.wrapProviderError('getObjectBuffer', input.key, error);
    }

    return this.toBuffer(response.Body);
  }

  async getObjectStream(input: GetObjectInput): Promise<Readable> {
    let response;
    try {
      response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: input.key,
        }),
      );
    } catch (error) {
      throw this.wrapProviderError('getObjectStream', input.key, error);
    }

    return this.toReadable(response.Body);
  }

  private wrapProviderError(
    operation: 'putObject' | 'getObjectBuffer' | 'getObjectStream' | 'deleteObject',
    key: string,
    error: unknown,
  ) {
    const message = error instanceof Error ? error.message : 'Unknown object storage provider error.';

    return new ObjectStorageProviderError(
      R2ObjectStorageAdapter.providerName,
      operation,
      `${this.bucketName}/${key}`,
      `${R2ObjectStorageAdapter.providerName} object storage ${operation} failed for '${this.bucketName}/${key}'. ${message}`,
      error,
    );
  }

  private async toBuffer(body: unknown): Promise<Buffer> {
    if (!body) {
      throw new Error('Object storage response body is empty');
    }

    if (Buffer.isBuffer(body)) {
      return body;
    }

    if (body instanceof Uint8Array) {
      return Buffer.from(body);
    }

    if (typeof body === 'string') {
      return Buffer.from(body);
    }

    if (body instanceof Readable) {
      return this.readReadable(body);
    }

    if (this.hasTransformToByteArray(body)) {
      return Buffer.from(await body.transformToByteArray());
    }

    if (this.hasTransformToWebStream(body)) {
      return this.readReadable(Readable.fromWeb(body.transformToWebStream()));
    }

    throw new Error('Unsupported object storage response body type');
  }

  private async toReadable(body: unknown): Promise<Readable> {
    if (!body) {
      throw new Error('Object storage response body is empty');
    }

    if (body instanceof Readable) {
      return body;
    }

    if (this.hasTransformToWebStream(body)) {
      return Readable.fromWeb(body.transformToWebStream());
    }

    return Readable.from([await this.toBuffer(body)]);
  }

  private hasTransformToByteArray(value: unknown): value is BodyWithByteArray {
    return this.hasFunction(value, 'transformToByteArray');
  }

  private hasTransformToWebStream(value: unknown): value is BodyWithWebStream {
    return this.hasFunction(value, 'transformToWebStream');
  }

  private hasFunction<T extends string>(value: unknown, key: T): value is Record<T, (...args: never[]) => unknown> {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const record = value as Record<string, unknown>;
    return key in record && typeof record[key] === 'function';
  }

  private async readReadable(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
        continue;
      }

      if (chunk instanceof Uint8Array) {
        chunks.push(Buffer.from(chunk));
        continue;
      }

      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
        continue;
      }

      throw new Error('Unsupported object storage stream chunk type');
    }

    return Buffer.concat(chunks);
  }
}
