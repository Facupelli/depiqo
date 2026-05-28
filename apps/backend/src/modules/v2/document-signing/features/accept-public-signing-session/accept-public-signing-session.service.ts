import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  V2ContractArtifactKind,
  V2ContractArtifactVisibility,
  V2DocumentSigningRequestStatus,
} from 'src/generated/prisma/enums';
import { TenantManagementPublicApi } from 'src/modules/v2/tenant-management/public-api/tenant-management.public-api';
import { RentalRemitoApplicationError } from 'src/modules/v2/contracts/application/rental-remito/rental-remito-application.error';
import { V2ContractsPublicApi } from 'src/modules/v2/contracts/public-api/contracts.public-api';

import {
  PublicSigningSessionLoader,
  PublicSigningSessionLoaderError,
} from '../../application/public-signing-session.loader';
import { hashSigningDocument } from '../../application/signing-document-hash';
import { SigningAcceptanceTextService } from '../../application/signing-acceptance-text.service';
import { SigningPdfStorageService } from '../../application/signing-pdf-storage.service';
import { SigningReceiptTokenService } from '../../application/signing-receipt-token.service';
import { SigningReceiptUrlService } from '../../application/signing-receipt-url.service';
import {
  SigningAcceptanceAlreadyCompletedError,
  SigningAcceptanceConfirmationRequiredError,
  SigningAcceptanceRenderFailedError,
  SigningAcceptanceSignatureRequiredError,
  SigningAcceptanceTextVersionInvalidError,
  SigningAcceptanceTextVersionRequiredError,
} from '../../domain/errors/document-signing.errors';
import { AcceptPublicSigningSessionCommand } from './accept-public-signing-session.command';
import { AcceptPublicSigningSessionResult } from './accept-public-signing-session.result';

export type AcceptPublicSigningSessionCommandError =
  | PublicSigningSessionLoaderError
  | SigningAcceptanceConfirmationRequiredError
  | SigningAcceptanceSignatureRequiredError
  | SigningAcceptanceTextVersionRequiredError
  | SigningAcceptanceTextVersionInvalidError
  | SigningAcceptanceAlreadyCompletedError
  | SigningAcceptanceRenderFailedError;

@Injectable()
@CommandHandler(AcceptPublicSigningSessionCommand)
export class AcceptPublicSigningSessionService implements ICommandHandler<
  AcceptPublicSigningSessionCommand,
  Result<AcceptPublicSigningSessionResult, AcceptPublicSigningSessionCommandError>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantManagementApi: TenantManagementPublicApi,
    private readonly publicSigningSessionLoader: PublicSigningSessionLoader,
    private readonly signingPdfStorageService: SigningPdfStorageService,
    private readonly acceptanceTextService: SigningAcceptanceTextService,
    private readonly receiptTokenService: SigningReceiptTokenService,
    private readonly receiptUrlService: SigningReceiptUrlService,
    private readonly contractsApi: V2ContractsPublicApi,
  ) {}

  async execute(
    command: AcceptPublicSigningSessionCommand,
  ): Promise<Result<AcceptPublicSigningSessionResult, AcceptPublicSigningSessionCommandError>> {
    if (command.accepted !== true) {
      return err(new SigningAcceptanceConfirmationRequiredError());
    }

    const signatureImageDataUrl = normalizeRequiredString(command.signatureImageDataUrl);

    if (!signatureImageDataUrl) {
      return err(new SigningAcceptanceSignatureRequiredError());
    }

    const acceptanceTextVersion = normalizeRequiredString(command.acceptanceTextVersion);

    if (!acceptanceTextVersion) {
      return err(new SigningAcceptanceTextVersionRequiredError());
    }

    const acceptanceText = this.acceptanceTextService.getAcceptanceTextByVersion(acceptanceTextVersion);

    if (!acceptanceText) {
      return err(new SigningAcceptanceTextVersionInvalidError(acceptanceTextVersion));
    }

    const sessionResult = await this.publicSigningSessionLoader.load({
      rawToken: command.rawToken,
      allowedStatuses: [V2DocumentSigningRequestStatus.SENT, V2DocumentSigningRequestStatus.VIEWED],
      markViewed: true,
    });

    if (sessionResult.isErr()) {
      return err(sessionResult.error);
    }

    const session = sessionResult.value;
    const signedAt = new Date();

    const existingAcceptance = await this.prisma.client.v2DocumentSignatureAcceptance.findUnique({
      where: {
        signingRequestId: session.id,
      },
      select: {
        id: true,
      },
    });

    if (existingAcceptance) {
      return err(new SigningAcceptanceAlreadyCompletedError());
    }

    const tenantResult = await this.tenantManagementApi.getTenant({ tenantId: session.tenantId });

    if (tenantResult.isErr()) {
      throw new Error(tenantResult.error.message, { cause: tenantResult.error.cause });
    }

    const tenant = tenantResult.value;

    const renderResult = await this.contractsApi.renderSignedRentalRemito({
      tenantId: session.tenantId,
      rentalId: session.rentalId,
      signatureImageDataUrl,
      signerEmail: session.signerEmail,
      signedAt,
      signingRequestId: session.id,
    });

    if (renderResult.isErr()) {
      return err(translateSignedRemitoRenderError(renderResult.error));
    }

    const signedDocumentHash = hashSigningDocument(renderResult.value.buffer);
    const signedArtifactId = randomUUID();
    const signedFileName = ensurePdfFileName(renderResult.value.fileName);

    const storedSignedPdf = await this.signingPdfStorageService.storeSignedPdf({
      tenantId: session.tenantId,
      contractId: session.contractId,
      rentalId: session.rentalId,
      artifactId: signedArtifactId,
      documentHash: signedDocumentHash,
      fileName: signedFileName,
      buffer: renderResult.value.buffer,
    });

    const rawReceiptToken = this.receiptTokenService.generateRawToken();
    const receiptTokenHash = this.receiptTokenService.hashToken(rawReceiptToken);
    const receiptTokenExpiresAt = this.receiptTokenService.buildExpiresAt(signedAt);
    const downloadUrl = this.receiptUrlService.buildSignedPdfDownloadUrl({
      tenant,
      rawReceiptToken,
    });

    await this.prisma.client.$transaction(async (tx) => {
      const currentRequest = await tx.v2DocumentSigningRequest.findFirst({
        where: {
          id: session.id,
          status: {
            in: [V2DocumentSigningRequestStatus.SENT, V2DocumentSigningRequestStatus.VIEWED],
          },
        },
        select: {
          id: true,
        },
      });

      if (!currentRequest) {
        throw new SigningAcceptanceAlreadyCompletedError();
      }

      const signedArtifact = await tx.v2ContractArtifact.create({
        data: {
          id: signedArtifactId,
          tenantId: session.tenantId,
          contractId: session.contractId,
          kind: V2ContractArtifactKind.SIGNED_PDF,
          visibility: V2ContractArtifactVisibility.PUBLIC,
          storageKey: storedSignedPdf.storageKey,
          fileName: storedSignedPdf.fileName,
          contentType: storedSignedPdf.contentType,
          byteSize: storedSignedPdf.byteSize,
          hashAlgorithm: 'SHA-256',
          documentHash: signedDocumentHash,
        },
      });

      await tx.v2DocumentSignatureAcceptance.create({
        data: {
          tenantId: session.tenantId,
          contractId: session.contractId,
          signingRequestId: session.id,
          signerName: session.signerName,
          signerEmail: session.signerEmail,
          signerPhone: session.signerPhone,
          signatureImageDataUrl,
          acceptanceTextVersion: acceptanceText.version,
          acceptanceTextSnapshot: acceptanceText.text,
          unsignedArtifactId: session.unsignedArtifact.id,
          signedArtifactId: signedArtifact.id,
          unsignedDocumentHash: session.unsignedArtifact.documentHash,
          signedDocumentHash,
          hashAlgorithm: 'SHA-256',
          acceptedAt: signedAt,
          acceptedIpAddress: normalizeNullableString(command.ipAddress),
          acceptedUserAgent: normalizeNullableString(command.userAgent),
          receiptTokenHash,
          receiptTokenExpiresAt,
          evidence: {
            signingRequestId: session.id,
            unsignedArtifactId: session.unsignedArtifact.id,
            signedArtifactId: signedArtifact.id,
            unsignedDocumentHash: session.unsignedArtifact.documentHash,
            signedDocumentHash,
            documentNumber: renderResult.value.documentNumber,
            receiptTokenExpiresAt,
          },
        },
      });

      await tx.v2DocumentSigningRequest.update({
        where: {
          id: session.id,
        },
        data: {
          status: V2DocumentSigningRequestStatus.SIGNED,
          signedAt,
          tokenHash: null,
        },
      });
    });

    const markSignedResult = await this.contractsApi.markRentalRemitoSigned({
      tenantId: session.tenantId,
      contractId: session.contractId,
      signingRequestId: session.id,
      signedAt,
    });

    if (markSignedResult.isErr()) {
      return err(translateSignedRemitoRenderError(markSignedResult.error));
    }

    return ok({
      requestId: session.id,
      status: V2DocumentSigningRequestStatus.SIGNED,
      signedAt,
      downloadUrl,
      receiptTokenExpiresAt,
    });
  }
}

function translateSignedRemitoRenderError(error: RentalRemitoApplicationError): SigningAcceptanceRenderFailedError {
  return new SigningAcceptanceRenderFailedError(error.message);
}

function normalizeRequiredString(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : null;
}

function ensurePdfFileName(fileName: string): string {
  return fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
}
