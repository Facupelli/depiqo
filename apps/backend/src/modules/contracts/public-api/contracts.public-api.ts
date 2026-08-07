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
  signer: {
    name: string;
    email: string | null;
    phone: string | null;
  };
  unsignedArtifact: {
    fileName: string;
    contentType: string;
    byteSize: number;
    documentHash: string;
  };
  acceptanceText: {
    version: string;
    text: string;
  };
}

export interface PublicRentalRemitoSigningSessionError {
  code: 'SigningTokenNotFound' | 'SigningRequestExpired' | 'SigningRequestUnavailable';
  message: string;
}

export interface PublicRentalRemitoReceiptError {
  code: 'ReceiptTokenNotFound' | 'ReceiptTokenExpired' | 'ReceiptTokenUnavailable';
  message: string;
}

export interface PublicRentalRemitoSignedArtifact {
  fileName: string;
  contentType: string;
  byteSize: number;
  stream: Readable;
}

export interface AcceptPublicRentalRemitoSigningInput {
  rawToken: string;
  signatureImageDataUrl: string;
  acceptanceTextVersion: string;
  acceptedIpAddress: string | null;
  acceptedUserAgent: string | null;
}

export interface AcceptPublicRentalRemitoSigningResult {
  requestId: string;
  status: 'SIGNED';
  signedAt: Date;
  receiptToken: string;
  receiptTokenExpiresAt: Date;
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

  abstract acceptPublicRentalRemitoSigning(
    input: AcceptPublicRentalRemitoSigningInput,
  ): Promise<Result<AcceptPublicRentalRemitoSigningResult, PublicRentalRemitoSigningSessionError>>;

  abstract streamPublicRentalRemitoSignedArtifact(
    rawReceiptToken: string,
  ): Promise<Result<PublicRentalRemitoSignedArtifact, PublicRentalRemitoReceiptError>>;
}
