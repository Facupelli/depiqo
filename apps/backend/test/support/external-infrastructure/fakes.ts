import { Readable } from 'node:stream';

import {
  EmailDeliveryPort,
  EmailDeliveryResult,
  EmailMessage,
} from '../../../src/modules/notifications/application/ports/email-delivery.port';
import {
  DeleteObjectInput,
  GetObjectInput,
  ObjectStoragePort,
  PutObjectInput,
} from '../../../src/modules/object-storage/application/ports/object-storage.port';
import {
  CustomHostname,
  CustomHostnameProvider,
} from '../../../src/modules/tenant-management/application/ports/custom-hostname-provider.port';
import {
  GoogleIdentityVerifier,
  VerifiedGoogleIdentity,
  VerifyGoogleAuthorizationCodeParams,
} from '../../../src/modules/tenant-management/auth/shared/google/google-identity-verifier.port';

export class FakeEmailDeliveryPort extends EmailDeliveryPort {
  readonly calls: EmailMessage[] = [];
  private nextResult: EmailDeliveryResult | null = null;

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    this.calls.push(message);

    const result = this.nextResult ?? {
      success: true as const,
      provider: 'TEST_EMAIL',
      providerMessageId: `test-email-${this.calls.length}`,
    };
    this.nextResult = null;

    return result;
  }

  setNextResult(result: EmailDeliveryResult): void {
    this.nextResult = result;
  }

  reset(): void {
    this.calls.length = 0;
    this.nextResult = null;
  }
}

export class FakeObjectStoragePort extends ObjectStoragePort {
  readonly putCalls: PutObjectInput[] = [];
  readonly getBufferCalls: GetObjectInput[] = [];
  readonly getStreamCalls: GetObjectInput[] = [];
  readonly deleteCalls: DeleteObjectInput[] = [];

  private readonly objects = new Map<string, Buffer>();
  private nextError: Error | null = null;

  async putObject(input: PutObjectInput): Promise<void> {
    this.putCalls.push(input);
    this.throwNextError();
    this.objects.set(input.key, toBuffer(input.body));
  }

  async getObjectBuffer(input: GetObjectInput): Promise<Buffer> {
    this.getBufferCalls.push(input);
    this.throwNextError();
    return Buffer.from(this.getObject(input.key));
  }

  async getObjectStream(input: GetObjectInput): Promise<Readable> {
    this.getStreamCalls.push(input);
    this.throwNextError();
    return Readable.from([Buffer.from(this.getObject(input.key))]);
  }

  async deleteObject(input: DeleteObjectInput): Promise<void> {
    this.deleteCalls.push(input);
    this.throwNextError();
    this.objects.delete(input.key);
  }

  failNext(error: Error): void {
    this.nextError = error;
  }

  reset(): void {
    this.putCalls.length = 0;
    this.getBufferCalls.length = 0;
    this.getStreamCalls.length = 0;
    this.deleteCalls.length = 0;
    this.objects.clear();
    this.nextError = null;
  }

  private throwNextError(): void {
    const error = this.nextError;
    this.nextError = null;
    if (error) throw error;
  }

  private getObject(key: string): Buffer {
    const object = this.objects.get(key);
    if (!object) throw new Error(`Test object storage does not contain '${key}'.`);
    return object;
  }
}

export class FakeCustomHostnameProvider extends CustomHostnameProvider {
  readonly createCalls: string[] = [];
  readonly getCalls: string[] = [];

  private readonly hostnames = new Map<string, CustomHostname>();
  private nextCreateResult: CustomHostname | null = null;
  private nextGetResult: CustomHostname | null = null;
  private nextError: Error | null = null;

  async createCustomHostname(hostname: string): Promise<CustomHostname> {
    this.createCalls.push(hostname);
    this.throwNextError();

    const result = this.nextCreateResult ?? this.defaultHostname(`test-hostname-${this.createCalls.length}`, hostname);
    this.nextCreateResult = null;
    this.hostnames.set(result.id, result);
    return result;
  }

  async getCustomHostname(providerHostnameId: string): Promise<CustomHostname> {
    this.getCalls.push(providerHostnameId);
    this.throwNextError();

    const result = this.nextGetResult ?? this.hostnames.get(providerHostnameId);
    this.nextGetResult = null;
    if (!result) throw new Error(`Test custom hostname '${providerHostnameId}' does not exist.`);

    return result;
  }

  setNextCreateResult(result: CustomHostname): void {
    this.nextCreateResult = result;
  }

  setNextGetResult(result: CustomHostname): void {
    this.nextGetResult = result;
  }

  failNext(error: Error): void {
    this.nextError = error;
  }

  reset(): void {
    this.createCalls.length = 0;
    this.getCalls.length = 0;
    this.hostnames.clear();
    this.nextCreateResult = null;
    this.nextGetResult = null;
    this.nextError = null;
  }

  private throwNextError(): void {
    const error = this.nextError;
    this.nextError = null;
    if (error) throw error;
  }

  private defaultHostname(id: string, hostname: string): CustomHostname {
    return {
      id,
      hostname,
      status: 'pending',
      sslStatus: 'pending_validation',
      validationErrors: [],
      ownershipVerificationErrors: [],
    };
  }
}

export class FakeGoogleIdentityVerifier extends GoogleIdentityVerifier {
  readonly calls: VerifyGoogleAuthorizationCodeParams[] = [];

  private nextIdentity: VerifiedGoogleIdentity | null = null;
  private nextError: Error | null = null;
  private readonly identitiesByAuthorizationCode = new Map<string, VerifiedGoogleIdentity>();

  async verifyAuthorizationCode(params: VerifyGoogleAuthorizationCodeParams): Promise<VerifiedGoogleIdentity> {
    this.calls.push(params);

    const error = this.nextError;
    this.nextError = null;
    if (error) throw error;

    const identity = this.identitiesByAuthorizationCode.get(params.code) ??
      this.nextIdentity ?? {
        provider: 'GOOGLE' as const,
        providerSubject: `test-google-subject-${this.calls.length}`,
        email: `google-user-${this.calls.length}@example.test`,
        emailVerified: true,
        givenName: 'Test',
        familyName: 'Google User',
        pictureUrl: null,
      };
    this.nextIdentity = null;

    return identity;
  }

  setNextIdentity(identity: VerifiedGoogleIdentity): void {
    this.nextIdentity = identity;
  }

  setIdentityForAuthorizationCode(code: string, identity: VerifiedGoogleIdentity): void {
    this.identitiesByAuthorizationCode.set(code, identity);
  }

  failNext(error: Error): void {
    this.nextError = error;
  }

  reset(): void {
    this.calls.length = 0;
    this.nextIdentity = null;
    this.nextError = null;
    this.identitiesByAuthorizationCode.clear();
  }
}

function toBuffer(body: Buffer | Uint8Array | string): Buffer {
  if (typeof body === 'string') return Buffer.from(body);
  return Buffer.from(body);
}
