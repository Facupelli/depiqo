import { Readable } from 'node:stream';

import { Result } from 'neverthrow';

import { RentalRemitoApplicationError } from '../application/rental-remito/rental-remito-application.error';
import { RentalRemitoForSigningReadModel } from '../features/prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.read-model';

export interface GetRentalContractStatusInput {
  tenantId: string;
  rentalId: string;
}

export type RentalContractStatus = 'DRAFT' | 'GENERATED' | 'SIGNING_REQUESTED' | 'SIGNED' | 'RESIGN_REQUIRED' | 'VOID';

export interface PrepareRentalRemitoForSigningInput {
  tenantId: string;
  rentalId: string;
}

export interface CreateRentalRemitoSigningRequestInput {
  tenantId: string;
  contractId: string;
  unsignedArtifactId: string;
  recipientEmail: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CreateRentalRemitoSigningRequestResult {
  requestId: string;
  expiresAt: Date;
  reusedExistingRequest: boolean;
}

export interface PublicRentalRemitoSigningSession {
  requestId: string;
  status: 'PENDING' | 'SENT' | 'VIEWED';
  expiresAt: Date;
  documentNumber: string;
  signerName: string;
  unsignedArtifact: {
    fileName: string;
    contentType: string;
    byteSize: number;
    documentHash: string;
  };
}

export interface PublicRentalRemitoSigningSessionError {
  code: 'SigningTokenNotFound' | 'SigningRequestExpired' | 'SigningRequestUnavailable';
  message: string;
}

export interface MarkRentalRemitoSigningRequestedInput {
  tenantId: string;
  contractId: string;
  signingRequestId: string;
}

export interface RenderSignedRentalRemitoInput {
  tenantId: string;
  rentalId: string;
  signatureImageDataUrl: string;
  signerEmail: string | null;
  signedAt: Date;
  signingRequestId: string;
}

export interface RenderSignedRentalRemitoResult {
  buffer: Buffer;
  fileName: string;
  documentNumber: string;
}

export interface MarkRentalRemitoSignedInput {
  tenantId: string;
  contractId: string;
  signingRequestId: string;
  signedAt: Date;
}

export abstract class V2ContractsPublicApi {
  abstract getRentalContractStatus(input: GetRentalContractStatusInput): Promise<RentalContractStatus | null>;

  abstract prepareRentalRemitoForSigning(
    input: PrepareRentalRemitoForSigningInput,
  ): Promise<Result<RentalRemitoForSigningReadModel, RentalRemitoApplicationError>>;

  abstract createRentalRemitoSigningRequest(
    input: CreateRentalRemitoSigningRequestInput,
  ): Promise<Result<CreateRentalRemitoSigningRequestResult, RentalRemitoApplicationError>>;

  abstract resolvePublicRentalRemitoSigningSession(
    rawToken: string,
  ): Promise<Result<PublicRentalRemitoSigningSession, PublicRentalRemitoSigningSessionError>>;

  abstract streamPublicRentalRemitoUnsignedArtifact(
    rawToken: string,
  ): Promise<Result<Readable, PublicRentalRemitoSigningSessionError>>;

  abstract markRentalRemitoSigningRequested(
    input: MarkRentalRemitoSigningRequestedInput,
  ): Promise<Result<void, RentalRemitoApplicationError>>;

  abstract renderSignedRentalRemito(
    input: RenderSignedRentalRemitoInput,
  ): Promise<Result<RenderSignedRentalRemitoResult, RentalRemitoApplicationError>>;

  abstract markRentalRemitoSigned(
    input: MarkRentalRemitoSignedInput,
  ): Promise<Result<void, RentalRemitoApplicationError>>;
}
