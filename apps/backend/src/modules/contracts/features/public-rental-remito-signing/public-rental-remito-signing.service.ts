import { createHash, randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';

import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { Result, err, ok } from 'neverthrow';

import { Env } from 'src/config/env.schema';
import { PrismaService } from 'src/core/database/prisma.service';
import {
  V2ContractArtifactKind,
  V2ContractArtifactStorageStatus,
  V2ContractStatus,
  V2DocumentSigningRequestStatus,
} from 'src/generated/prisma/enums';
import { ObjectStoragePort } from 'src/modules/object-storage/application/ports/object-storage.port';

import { ContractArtifactPersistenceService } from '../../application/contract-artifact-persistence.service';
import { getRentalRemitoAcceptanceText } from '../../application/rental-remito/rental-remito-acceptance-text.registry';
import { RentalRemitoSignedArtifactService } from '../../application/rental-remito/rental-remito-signed-artifact.service';
import { PublicRentalRemitoSigningError } from './public-rental-remito-signing.errors';

type ActiveRequest = {
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
};
type SigningResult = {
  requestId: string;
  status: 'SIGNED';
  signedAt: Date;
  receiptToken: string;
  receiptTokenExpiresAt: Date;
};
type DocumentStream = { fileName: string; contentType: string; byteSize: number; stream: Readable };

@Injectable()
export class PublicRentalRemitoSigningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signedArtifactService: RentalRemitoSignedArtifactService,
    private readonly artifactPersistence: ContractArtifactPersistenceService,
    private readonly objectStorage: ObjectStoragePort,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async resolve(rawToken: string): Promise<Result<{ requestId: string }, PublicRentalRemitoSigningError>> {
    const request = await this.loadActiveRequest(rawToken);
    return request.isErr() ? err(request.error) : ok({ requestId: request.value.id });
  }

  async getSession(rawToken: string): Promise<Result<ActiveRequest, PublicRentalRemitoSigningError>> {
    return this.loadActiveRequest(rawToken);
  }

  async streamUnsigned(rawToken: string): Promise<Result<DocumentStream, PublicRentalRemitoSigningError>> {
    const request = await this.loadActiveRequest(rawToken);
    if (request.isErr()) return err(request.error);
    const artifact = request.value.unsignedArtifact;
    return ok({
      fileName: artifact.fileName,
      contentType: artifact.contentType,
      byteSize: artifact.byteSize,
      stream: await this.objectStorage.getObjectStream({ key: artifact.storageKey }),
    });
  }

  async accept(input: {
    rawToken: string;
    signatureImageDataUrl: string;
    acceptanceTextVersion: string;
    accepted: boolean;
    acceptedIpAddress: string | null;
    acceptedUserAgent: string | null;
  }): Promise<Result<SigningResult, PublicRentalRemitoSigningError>> {
    if (!input.accepted)
      return err({
        code: 'AcceptanceConfirmationRequired',
        message: 'Signing acceptance requires explicit confirmation from the signer.',
      });
    const requestResult = await this.loadActiveRequest(input.rawToken);
    if (requestResult.isErr()) return err(requestResult.error);
    const request = requestResult.value;
    if (request.acceptanceText.version !== input.acceptanceTextVersion.trim())
      return err({
        code: 'SigningRequestUnavailable',
        message: `Document signing request '${request.id}' does not match the required acceptance text version.`,
      });
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
    if (artifactResult.isErr()) throw new Error(artifactResult.error.message);
    return this.prisma.client.$transaction(async (tx) => {
      const contract = await tx.v2Contract.findUnique({ where: { id: request.contractId }, select: { status: true } });
      if (!contract || contract.status === V2ContractStatus.VOID)
        return err({
          code: 'SigningRequestUnavailable',
          message: `Document signing request '${request.id}' is not available.`,
        });
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
      if (signedRequest.count !== 1)
        return err({
          code: 'SigningRequestUnavailable',
          message: `Document signing request '${request.id}' is no longer available.`,
        });
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
      return ok({ requestId: request.id, status: 'SIGNED' as const, signedAt, receiptToken, receiptTokenExpiresAt });
    });
  }

  async streamSigned(rawReceiptToken: string): Promise<Result<DocumentStream, PublicRentalRemitoSigningError>> {
    const normalizedToken = rawReceiptToken.trim();
    if (!normalizedToken)
      return err({ code: 'ReceiptTokenNotFound', message: 'Signed document receipt token was not found.' });
    const acceptance = await this.prisma.client.v2DocumentSignatureAcceptance.findUnique({
      where: { receiptTokenHash: hashToken(normalizedToken) },
      select: {
        id: true,
        receiptTokenExpiresAt: true,
        signedArtifact: {
          select: { storageKey: true, fileName: true, contentType: true, byteSize: true, storageStatus: true },
        },
      },
    });
    if (!acceptance)
      return err({ code: 'ReceiptTokenNotFound', message: 'Signed document receipt token was not found.' });
    if (!acceptance.receiptTokenExpiresAt || acceptance.receiptTokenExpiresAt <= new Date())
      return err({ code: 'ReceiptTokenExpired', message: 'Signed document receipt token has expired.' });
    if (
      !acceptance.signedArtifact ||
      acceptance.signedArtifact.storageStatus !== V2ContractArtifactStorageStatus.AVAILABLE
    )
      return err({ code: 'ReceiptTokenUnavailable', message: 'Signed document artifact is not available.' });
    await this.prisma.client.v2DocumentSignatureAcceptance.update({
      where: { id: acceptance.id },
      data: { receiptDownloadedAt: new Date() },
    });
    const artifact = acceptance.signedArtifact;
    return ok({
      fileName: artifact.fileName,
      contentType: artifact.contentType,
      byteSize: artifact.byteSize,
      stream: await this.objectStorage.getObjectStream({ key: artifact.storageKey }),
    });
  }

  private async loadActiveRequest(rawToken: string): Promise<Result<ActiveRequest, PublicRentalRemitoSigningError>> {
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
      )
        await this.prisma.client.v2DocumentSigningRequest.update({
          where: { id: request.id },
          data: { status: V2DocumentSigningRequestStatus.EXPIRED },
        });
      return err({ code: 'SigningRequestExpired', message: `Document signing request '${request.id}' has expired.` });
    }
    if (
      request.status !== V2DocumentSigningRequestStatus.PENDING &&
      request.status !== V2DocumentSigningRequestStatus.SENT &&
      request.status !== V2DocumentSigningRequestStatus.VIEWED
    )
      return err({
        code: 'SigningRequestUnavailable',
        message: `Document signing request '${request.id}' is not available.`,
      });
    if (request.unsignedArtifact.storageStatus !== V2ContractArtifactStorageStatus.AVAILABLE)
      return err({
        code: 'SigningRequestUnavailable',
        message: `Document signing request '${request.id}' has no available unsigned artifact.`,
      });
    if (!request.contract.documentNumber)
      throw new Error(`Contract signing request '${request.id}' is missing its document number.`);
    const acceptanceText = getRentalRemitoAcceptanceText(request.acceptanceTextVersion);
    if (!acceptanceText)
      throw new Error(`Contract signing request '${request.id}' has an unsupported acceptance text version.`);
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
