import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  V2ContractArtifactStorageStatus,
  V2ContractStatus,
  V2DocumentSigningRequestStatus,
} from 'src/generated/prisma/enums';
import { ObjectStoragePort } from 'src/modules/object-storage/application/ports/object-storage.port';
import { Result, err, ok } from 'neverthrow';

import { RentalRemitoApplicationError } from '../application/rental-remito/rental-remito-application.error';
import { RentalRemitoContractStateService } from '../application/rental-remito/rental-remito-contract-state.service';
import { RentalRemitoDocumentService } from '../application/rental-remito/rental-remito-document.service';
import { PrepareRentalRemitoForSigningResult } from '../features/prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.handler';
import { PrepareRentalRemitoForSigningQuery } from '../features/prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.query';
import { RentalRemitoForSigningReadModel } from '../features/prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.read-model';
import {
  CreateRentalRemitoSigningRequestInput,
  CreateRentalRemitoSigningRequestResult,
  GetRentalContractStatusInput,
  RentalContractStatus,
  MarkRentalRemitoSignedInput,
  MarkRentalRemitoSigningRequestedInput,
  PublicRentalRemitoSigningSession,
  PublicRentalRemitoSigningSessionError,
  PrepareRentalRemitoForSigningInput,
  RenderSignedRentalRemitoInput,
  RenderSignedRentalRemitoResult,
  V2ContractsPublicApi,
} from './contracts.public-api';

@Injectable()
export class V2ContractsPublicApiService implements V2ContractsPublicApi {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
    private readonly contractStateService: RentalRemitoContractStateService,
    private readonly rentalRemitoDocumentService: RentalRemitoDocumentService,
    private readonly objectStorage: ObjectStoragePort,
  ) {}

  async getRentalContractStatus(input: GetRentalContractStatusInput): Promise<RentalContractStatus | null> {
    const contract = await this.prisma.client.v2Contract.findFirst({
      where: { tenantId: input.tenantId, rentalId: input.rentalId },
      select: { status: true },
    });

    return contract?.status ?? null;
  }

  prepareRentalRemitoForSigning(
    input: PrepareRentalRemitoForSigningInput,
  ): Promise<Result<RentalRemitoForSigningReadModel, RentalRemitoApplicationError>> {
    return this.queryBus.execute<PrepareRentalRemitoForSigningQuery, PrepareRentalRemitoForSigningResult>(
      new PrepareRentalRemitoForSigningQuery(input.tenantId, input.rentalId),
    );
  }

  async createRentalRemitoSigningRequest(
    input: CreateRentalRemitoSigningRequestInput,
  ): Promise<Result<CreateRentalRemitoSigningRequestResult, RentalRemitoApplicationError>> {
    const artifact = await this.prisma.client.v2ContractArtifact.findFirst({
      where: {
        id: input.unsignedArtifactId,
        contractId: input.contractId,
        tenantId: input.tenantId,
        storageStatus: 'AVAILABLE',
        kind: 'UNSIGNED_PDF',
      },
      select: { id: true },
    });
    if (!artifact) return err({ code: 'RentalNotFound', message: 'Unsigned contract artifact was not found.' });
    const request = await this.prisma.client.$transaction(async (tx) => {
      const active = await tx.v2DocumentSigningRequest.findFirst({
        where: {
          tenantId: input.tenantId,
          contractId: input.contractId,
          unsignedArtifactId: input.unsignedArtifactId,
          status: {
            in: [
              V2DocumentSigningRequestStatus.PENDING,
              V2DocumentSigningRequestStatus.SENT,
              V2DocumentSigningRequestStatus.VIEWED,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (active && active.expiresAt && active.expiresAt > new Date()) {
        const updated = await tx.v2DocumentSigningRequest.update({
          where: { id: active.id },
          data: {
            signerEmail: input.recipientEmail,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
            status: V2DocumentSigningRequestStatus.PENDING,
          },
          select: { id: true, expiresAt: true },
        });
        return { requestId: updated.id, expiresAt: updated.expiresAt ?? input.expiresAt, reusedExistingRequest: true };
      }
      if (active)
        await tx.v2DocumentSigningRequest.update({
          where: { id: active.id },
          data: { status: V2DocumentSigningRequestStatus.EXPIRED },
        });
      const created = await tx.v2DocumentSigningRequest.create({
        data: {
          tenantId: input.tenantId,
          contractId: input.contractId,
          rentalId: (
            await tx.v2Contract.findUniqueOrThrow({ where: { id: input.contractId }, select: { rentalId: true } })
          ).rentalId,
          unsignedArtifactId: input.unsignedArtifactId,
          signerName: input.recipientEmail,
          signerEmail: input.recipientEmail,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          status: V2DocumentSigningRequestStatus.SENT,
        },
        select: { id: true, expiresAt: true },
      });
      await tx.v2Contract.update({
        where: { id: input.contractId },
        data: { status: V2ContractStatus.SIGNING_REQUESTED },
      });
      return { requestId: created.id, expiresAt: created.expiresAt ?? input.expiresAt, reusedExistingRequest: false };
    });
    return ok(request);
  }

  async resolvePublicRentalRemitoSigningSession(
    rawToken: string,
  ): Promise<Result<PublicRentalRemitoSigningSession, PublicRentalRemitoSigningSessionError>> {
    const request = await this.loadActivePublicSigningRequest(rawToken);
    if (request.isErr()) return err(request.error);

    return ok({
      requestId: request.value.id,
      status: request.value.status,
      expiresAt: request.value.expiresAt,
      documentNumber: request.value.contract.documentNumber,
      signerName: request.value.signerName,
      unsignedArtifact: {
        fileName: request.value.unsignedArtifact.fileName,
        contentType: request.value.unsignedArtifact.contentType,
        byteSize: request.value.unsignedArtifact.byteSize,
        documentHash: request.value.unsignedArtifact.documentHash,
      },
    });
  }

  async streamPublicRentalRemitoUnsignedArtifact(
    rawToken: string,
  ): Promise<Result<Readable, PublicRentalRemitoSigningSessionError>> {
    const request = await this.loadActivePublicSigningRequest(rawToken);
    if (request.isErr()) return err(request.error);

    return ok(await this.objectStorage.getObjectStream({ key: request.value.unsignedArtifact.storageKey }));
  }

  markRentalRemitoSigningRequested(
    input: MarkRentalRemitoSigningRequestedInput,
  ): Promise<Result<void, RentalRemitoApplicationError>> {
    return this.contractStateService.markSigningRequested(input);
  }

  async renderSignedRentalRemito(
    input: RenderSignedRentalRemitoInput,
  ): Promise<Result<RenderSignedRentalRemitoResult, RentalRemitoApplicationError>> {
    const renderResult = await this.rentalRemitoDocumentService.render({
      tenantId: input.tenantId,
      rentalId: input.rentalId,
      purpose: 'signing',
      signedSummary: {
        signatureImageDataUrl: input.signatureImageDataUrl,
        signerEmail: input.signerEmail,
        signedAt: input.signedAt.toISOString(),
        sessionReference: input.signingRequestId,
      },
    });

    if (renderResult.isErr()) {
      return renderResult;
    }

    return ok({
      buffer: renderResult.value.buffer,
      fileName: renderResult.value.fileName,
      documentNumber: renderResult.value.documentNumber,
    });
  }

  markRentalRemitoSigned(input: MarkRentalRemitoSignedInput): Promise<Result<void, RentalRemitoApplicationError>> {
    return this.contractStateService.markSigned(input);
  }

  private async loadActivePublicSigningRequest(rawToken: string): Promise<
    Result<
      {
        id: string;
        status: 'PENDING' | 'SENT' | 'VIEWED';
        expiresAt: Date;
        signerName: string;
        contract: { documentNumber: string };
        unsignedArtifact: {
          storageKey: string;
          fileName: string;
          contentType: string;
          byteSize: number;
          documentHash: string;
        };
      },
      PublicRentalRemitoSigningSessionError
    >
  > {
    const normalizedToken = rawToken.trim();
    if (!normalizedToken) return err({ code: 'SigningTokenNotFound', message: 'Signing token was not found.' });

    const request = await this.prisma.client.v2DocumentSigningRequest.findUnique({
      where: { tokenHash: createHash('sha256').update(normalizedToken).digest('hex') },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        signerName: true,
        contract: { select: { documentNumber: true } },
        unsignedArtifact: {
          select: {
            storageKey: true,
            fileName: true,
            contentType: true,
            byteSize: true,
            documentHash: true,
            storageStatus: true,
          },
        },
      },
    });

    if (!request) return err({ code: 'SigningTokenNotFound', message: 'Signing token was not found.' });
    if (!request.expiresAt || request.expiresAt <= new Date()) {
      if (
        request.status === V2DocumentSigningRequestStatus.PENDING ||
        request.status === V2DocumentSigningRequestStatus.SENT ||
        request.status === V2DocumentSigningRequestStatus.VIEWED
      ) {
        await this.prisma.client.v2DocumentSigningRequest.update({
          where: { id: request.id },
          data: { status: V2DocumentSigningRequestStatus.EXPIRED },
        });
      }
      return err({ code: 'SigningRequestExpired', message: `Document signing request '${request.id}' has expired.` });
    }
    if (
      request.status !== V2DocumentSigningRequestStatus.PENDING &&
      request.status !== V2DocumentSigningRequestStatus.SENT &&
      request.status !== V2DocumentSigningRequestStatus.VIEWED
    ) {
      return err({
        code: 'SigningRequestUnavailable',
        message: `Document signing request '${request.id}' is not available.`,
      });
    }
    if (request.unsignedArtifact.storageStatus !== V2ContractArtifactStorageStatus.AVAILABLE) {
      return err({
        code: 'SigningRequestUnavailable',
        message: `Document signing request '${request.id}' has no available unsigned artifact.`,
      });
    }
    if (!request.contract.documentNumber) {
      throw new Error(`Contract signing request '${request.id}' is missing its document number.`);
    }

    return ok({
      id: request.id,
      status: request.status,
      expiresAt: request.expiresAt,
      signerName: request.signerName,
      contract: { documentNumber: request.contract.documentNumber },
      unsignedArtifact: {
        storageKey: request.unsignedArtifact.storageKey,
        fileName: request.unsignedArtifact.fileName,
        contentType: request.unsignedArtifact.contentType,
        byteSize: request.unsignedArtifact.byteSize,
        documentHash: request.unsignedArtifact.documentHash,
      },
    });
  }
}
