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
