import { createHash, randomBytes } from 'node:crypto';

import { ConfigService } from '@nestjs/config';

import { Env } from 'src/config/env.schema';
import { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  V2ContractArtifactKind,
  V2ContractArtifactStorageStatus,
  V2ContractStatus,
  V2DocumentSigningRequestStatus,
} from 'src/generated/prisma/enums';
import { ObjectStoragePort } from 'src/modules/object-storage/application/ports/object-storage.port';
import { Result, err, ok } from 'neverthrow';

import { RentalRemitoApplicationError } from '../application/rental-remito/rental-remito-application.error';
import { ContractArtifactPersistenceService } from '../application/contract-artifact-persistence.service';
import {
  getRentalRemitoAcceptanceText,
  RENTAL_REMITO_ACCEPTANCE_TEXT_VERSION,
} from '../application/rental-remito/rental-remito-acceptance-text.registry';
import { RentalRemitoSignedArtifactService } from '../application/rental-remito/rental-remito-signed-artifact.service';
import { PrepareRentalRemitoForSigningResult } from '../features/prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.handler';
import { PrepareRentalRemitoForSigningQuery } from '../features/prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.query';
import { RentalRemitoForSigningReadModel } from '../features/prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.read-model';
import {
  AcceptPublicRentalRemitoSigningInput,
  AcceptPublicRentalRemitoSigningResult,
  CreateRentalRemitoSigningRequestInput,
  CreateRentalRemitoSigningRequestResult,
  GetRentalContractStatusInput,
  RentalContractStatus,
  PublicRentalRemitoSigningSession,
  PublicRentalRemitoReceiptError,
  PublicRentalRemitoSignedArtifact,
  PublicRentalRemitoSigningSessionError,
  PrepareRentalRemitoForSigningInput,
  V2ContractsPublicApi,
} from './contracts.public-api';

@Injectable()
export class V2ContractsPublicApiService implements V2ContractsPublicApi {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
    private readonly signedArtifactService: RentalRemitoSignedArtifactService,
    private readonly artifactPersistence: ContractArtifactPersistenceService,
    private readonly objectStorage: ObjectStoragePort,
    private readonly config: ConfigService<Env, true>,
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
          acceptanceTextVersion: RENTAL_REMITO_ACCEPTANCE_TEXT_VERSION,
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
      signer: {
        name: request.value.signerName,
        email: request.value.signerEmail,
        phone: request.value.signerPhone,
      },
      unsignedArtifact: {
        fileName: request.value.unsignedArtifact.fileName,
        contentType: request.value.unsignedArtifact.contentType,
        byteSize: request.value.unsignedArtifact.byteSize,
        documentHash: request.value.unsignedArtifact.documentHash,
      },
      acceptanceText: request.value.acceptanceText,
    });
  }

  async streamPublicRentalRemitoUnsignedArtifact(
    rawToken: string,
  ): Promise<Result<Readable, PublicRentalRemitoSigningSessionError>> {
    const request = await this.loadActivePublicSigningRequest(rawToken);
    if (request.isErr()) return err(request.error);

    return ok(await this.objectStorage.getObjectStream({ key: request.value.unsignedArtifact.storageKey }));
  }

  async acceptPublicRentalRemitoSigning(
    input: AcceptPublicRentalRemitoSigningInput,
  ): Promise<Result<AcceptPublicRentalRemitoSigningResult, PublicRentalRemitoSigningSessionError>> {
    const requestResult = await this.loadActivePublicSigningRequest(input.rawToken);
    if (requestResult.isErr()) return err(requestResult.error);

    const request = requestResult.value;
    if (request.acceptanceText.version !== input.acceptanceTextVersion.trim()) {
      return err({
        code: 'SigningRequestUnavailable',
        message: `Document signing request '${request.id}' does not match the required acceptance text version.`,
      });
    }

    const unsignedPdf = await this.objectStorage.getObjectBuffer({ key: request.unsignedArtifact.storageKey });
    const signedAt = new Date();
    const receiptToken = randomBytes(32).toString('hex');
    const receiptTokenExpiresAt = new Date(
      signedAt.getTime() + this.config.get('DOCUMENT_SIGNING_RECEIPT_TOKEN_TTL_SECONDS') * 1000,
    );
    const signedPdf = await this.signedArtifactService.create({
      unsignedPdf,
      signatureImageDataUrl: input.signatureImageDataUrl,
    });
    const artifactResult = await this.artifactPersistence.persist({
      tenantId: request.tenantId,
      contractId: request.contractId,
      kind: V2ContractArtifactKind.SIGNED_PDF,
      fileName: toSignedFileName(request.unsignedArtifact.fileName),
      buffer: signedPdf,
    });
    if (artifactResult.isErr()) {
      throw new Error(artifactResult.error.message);
    }

    const transition = await this.prisma.client.$transaction(async (tx) => {
      const contract = await tx.v2Contract.findUnique({
        where: { id: request.contractId },
        select: { status: true },
      });
      if (!contract || contract.status === V2ContractStatus.VOID) {
        return err<AcceptPublicRentalRemitoSigningResult, PublicRentalRemitoSigningSessionError>({
          code: 'SigningRequestUnavailable',
          message: `Document signing request '${request.id}' is not available.`,
        });
      }

      const signedRequest = await tx.v2DocumentSigningRequest.updateMany({
        where: {
          id: request.id,
          status: {
            in: [
              V2DocumentSigningRequestStatus.PENDING,
              V2DocumentSigningRequestStatus.SENT,
              V2DocumentSigningRequestStatus.VIEWED,
            ],
          },
        },
        data: { status: V2DocumentSigningRequestStatus.SIGNED, signedAt },
      });
      if (signedRequest.count !== 1) {
        return err<AcceptPublicRentalRemitoSigningResult, PublicRentalRemitoSigningSessionError>({
          code: 'SigningRequestUnavailable',
          message: `Document signing request '${request.id}' is no longer available.`,
        });
      }

      await tx.v2DocumentSignatureAcceptance.create({
        data: {
          tenantId: request.tenantId,
          contractId: request.contractId,
          signingRequestId: request.id,
          signerName: request.signerName,
          signerEmail: request.signerEmail,
          signatureImageDataUrl: input.signatureImageDataUrl,
          acceptanceTextVersion: request.acceptanceText.version,
          acceptanceTextSnapshot: request.acceptanceText.text,
          unsignedArtifactId: request.unsignedArtifact.id,
          signedArtifactId: artifactResult.value.id,
          unsignedDocumentHash: request.unsignedArtifact.documentHash,
          signedDocumentHash: artifactResult.value.documentHash,
          receiptTokenHash: hashToken(receiptToken),
          receiptTokenExpiresAt,
          acceptedAt: signedAt,
          acceptedIpAddress: input.acceptedIpAddress,
          acceptedUserAgent: input.acceptedUserAgent,
        },
      });
      await tx.v2Contract.update({
        where: { id: request.contractId },
        data: { status: V2ContractStatus.SIGNED, signedAt },
      });

      return ok<AcceptPublicRentalRemitoSigningResult, PublicRentalRemitoSigningSessionError>({
        requestId: request.id,
        status: 'SIGNED',
        signedAt,
        receiptToken,
        receiptTokenExpiresAt,
      });
    });

    return transition;
  }

  async streamPublicRentalRemitoSignedArtifact(
    rawReceiptToken: string,
  ): Promise<Result<PublicRentalRemitoSignedArtifact, PublicRentalRemitoReceiptError>> {
    const normalizedToken = rawReceiptToken.trim();
    if (!normalizedToken) {
      return err({ code: 'ReceiptTokenNotFound', message: 'Signed document receipt token was not found.' });
    }

    const acceptance = await this.prisma.client.v2DocumentSignatureAcceptance.findUnique({
      where: { receiptTokenHash: hashToken(normalizedToken) },
      select: {
        id: true,
        receiptTokenExpiresAt: true,
        signedArtifact: {
          select: {
            storageKey: true,
            fileName: true,
            contentType: true,
            byteSize: true,
            storageStatus: true,
          },
        },
      },
    });
    if (!acceptance) {
      return err({ code: 'ReceiptTokenNotFound', message: 'Signed document receipt token was not found.' });
    }
    if (!acceptance.receiptTokenExpiresAt || acceptance.receiptTokenExpiresAt <= new Date()) {
      return err({ code: 'ReceiptTokenExpired', message: 'Signed document receipt token has expired.' });
    }
    if (
      !acceptance.signedArtifact ||
      acceptance.signedArtifact.storageStatus !== V2ContractArtifactStorageStatus.AVAILABLE
    ) {
      return err({ code: 'ReceiptTokenUnavailable', message: 'Signed document artifact is not available.' });
    }

    await this.prisma.client.v2DocumentSignatureAcceptance.update({
      where: { id: acceptance.id },
      data: { receiptDownloadedAt: new Date() },
    });

    return ok({
      fileName: acceptance.signedArtifact.fileName,
      contentType: acceptance.signedArtifact.contentType,
      byteSize: acceptance.signedArtifact.byteSize,
      stream: await this.objectStorage.getObjectStream({ key: acceptance.signedArtifact.storageKey }),
    });
  }

  private async loadActivePublicSigningRequest(rawToken: string): Promise<
    Result<
      {
        id: string;
        tenantId: string;
        contractId: string;
        status: 'PENDING' | 'SENT' | 'VIEWED';
        expiresAt: Date;
        signerName: string;
        signerEmail: string | null;
        signerPhone: string | null;
        acceptanceText: { version: string; text: string };
        contract: { documentNumber: string };
        unsignedArtifact: {
          id: string;
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
      where: { tokenHash: hashToken(normalizedToken) },
      select: {
        id: true,
        tenantId: true,
        contractId: true,
        status: true,
        expiresAt: true,
        signerName: true,
        signerEmail: true,
        signerPhone: true,
        acceptanceTextVersion: true,
        contract: { select: { documentNumber: true } },
        unsignedArtifact: {
          select: {
            id: true,
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
    const acceptanceText = getRentalRemitoAcceptanceText(request.acceptanceTextVersion);
    if (!acceptanceText) {
      throw new Error(`Contract signing request '${request.id}' has an unsupported acceptance text version.`);
    }

    return ok({
      id: request.id,
      tenantId: request.tenantId,
      contractId: request.contractId,
      status: request.status,
      expiresAt: request.expiresAt,
      signerName: request.signerName,
      signerEmail: request.signerEmail,
      signerPhone: request.signerPhone,
      acceptanceText,
      contract: { documentNumber: request.contract.documentNumber },
      unsignedArtifact: {
        id: request.unsignedArtifact.id,
        storageKey: request.unsignedArtifact.storageKey,
        fileName: request.unsignedArtifact.fileName,
        contentType: request.unsignedArtifact.contentType,
        byteSize: request.unsignedArtifact.byteSize,
        documentHash: request.unsignedArtifact.documentHash,
      },
    });
  }
}

function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function toSignedFileName(unsignedFileName: string): string {
  return unsignedFileName.endsWith('.pdf')
    ? `${unsignedFileName.slice(0, -'.pdf'.length)}-signed.pdf`
    : `${unsignedFileName}-signed.pdf`;
}
