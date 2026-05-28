import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { Env } from 'src/config/env.schema';
import { PrismaService } from 'src/core/database/prisma.service';
import {
  V2ContractArtifactKind,
  V2ContractArtifactVisibility,
  V2DocumentSigningRequestStatus,
} from 'src/generated/prisma/enums';
import { TenantManagementPublicApi } from 'src/modules/v2/tenant-management/public-api/tenant-management.public-api';
import { RentalRemitoApplicationError } from 'src/modules/v2/contracts/application/rental-remito/rental-remito-application.error';
import { V2ContractsPublicApi } from 'src/modules/v2/contracts/public-api/contracts.public-api';

import { hashSigningDocument } from '../../application/signing-document-hash';
import { SigningNotificationService } from '../../application/signing-notification.service';
import { SigningPdfStorageService } from '../../application/signing-pdf-storage.service';
import { SigningTokenService } from '../../application/signing-token.service';
import {
  SigningInvitationCustomerProfileMissingError,
  SigningInvitationEmailDeliveryFailedError,
  SigningInvitationOrderNotFoundError,
  SigningInvitationOrderNotReadyError,
  SigningInvitationRecipientEmailRequiredError,
} from '../../domain/errors/document-signing.errors';
import { SendSigningInvitationCommand } from './send-signing-invitation.command';
import { SendSigningInvitationInput, SendSigningInvitationResult } from './send-signing-invitation.result';

export type SendSigningInvitationCommandError =
  | SigningInvitationCustomerProfileMissingError
  | SigningInvitationOrderNotFoundError
  | SigningInvitationOrderNotReadyError
  | SigningInvitationRecipientEmailRequiredError
  | SigningInvitationEmailDeliveryFailedError;

interface PersistSigningRequestResult {
  requestId: string;
  tokenHash: string;
  expiresAt: Date;
  reusedExistingRequest: boolean;
}

@Injectable()
@CommandHandler(SendSigningInvitationCommand)
export class SendSigningInvitationService implements ICommandHandler<
  SendSigningInvitationCommand,
  Result<SendSigningInvitationResult, SendSigningInvitationCommandError>
> {
  private readonly signingRequestTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly signingNotificationService: SigningNotificationService,
    private readonly signingPdfStorageService: SigningPdfStorageService,
    private readonly signingTokenService: SigningTokenService,
    private readonly contractsApi: V2ContractsPublicApi,
    private readonly tenantManagementApi: TenantManagementPublicApi,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.signingRequestTtlSeconds = this.configService.get('DOCUMENT_SIGNING_SESSION_TTL_SECONDS');
  }

  async execute(
    command: SendSigningInvitationCommand,
  ): Promise<Result<SendSigningInvitationResult, SendSigningInvitationCommandError>> {
    const input: SendSigningInvitationInput = {
      tenantId: command.tenantId,
      orderId: command.orderId,
      documentType: command.documentType,
      recipientEmail: command.recipientEmail,
    };

    const preparedRemito = await this.contractsApi.prepareRentalRemitoForSigning({
      tenantId: input.tenantId,
      rentalId: input.orderId,
    });

    if (preparedRemito.isErr()) {
      return err(translatePrepareRentalRemitoForSigningError(input.orderId, preparedRemito.error));
    }

    const tenantResult = await this.tenantManagementApi.getTenant({ tenantId: input.tenantId });

    if (tenantResult.isErr()) {
      throw new Error(tenantResult.error.message, { cause: tenantResult.error.cause });
    }

    const tenant = tenantResult.value;

    const recipientEmail =
      normalizeRecipientEmail(input.recipientEmail) ?? normalizeRecipientEmail(preparedRemito.value.customerEmail);

    if (!recipientEmail) {
      return err(new SigningInvitationRecipientEmailRequiredError(input.orderId));
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.signingRequestTtlSeconds * 1000);
    const rawToken = this.signingTokenService.generateRawToken();
    const tokenHash = this.signingTokenService.hashToken(rawToken);
    const documentHash = hashSigningDocument(preparedRemito.value.buffer);
    const pdfFileName = ensurePdfFileName(preparedRemito.value.fileName);

    const requestResult = await this.persistSigningRequest({
      tenantId: input.tenantId,
      rentalId: input.orderId,
      contractId: preparedRemito.value.contractId,
      customerEmail: preparedRemito.value.customerEmail,
      recipientEmail,
      signerName: resolveSignerName(recipientEmail),
      tokenHash,
      documentHash,
      documentNumber: preparedRemito.value.documentNumber,
      fileName: pdfFileName,
      buffer: preparedRemito.value.buffer,
      now,
      expiresAt,
    });

    const markSigningRequestedResult = await this.contractsApi.markRentalRemitoSigningRequested({
      tenantId: input.tenantId,
      contractId: preparedRemito.value.contractId,
      signingRequestId: requestResult.requestId,
    });

    if (markSigningRequestedResult.isErr()) {
      return err(translatePrepareRentalRemitoForSigningError(input.orderId, markSigningRequestedResult.error));
    }

    const deliveryResult = await this.signingNotificationService.sendInvitation({
      tenant,
      requestId: requestResult.requestId,
      orderId: input.orderId,
      documentType: input.documentType,
      documentNumber: preparedRemito.value.documentNumber,
      rawToken,
      tokenHash: requestResult.tokenHash,
      recipientEmail,
      expiresAt: requestResult.expiresAt,
      resend: requestResult.reusedExistingRequest,
    });

    if (deliveryResult.deliveryError) {
      await this.prisma.client.v2DocumentSigningRequest.update({
        where: { id: requestResult.requestId },
        data: {
          status: V2DocumentSigningRequestStatus.FAILED,
          failedAt: new Date(),
        },
      });

      return err(deliveryResult.deliveryError);
    }

    await this.prisma.client.v2DocumentSigningRequest.update({
      where: { id: requestResult.requestId },
      data: {
        status: V2DocumentSigningRequestStatus.SENT,
        sentAt: new Date(),
      },
    });

    return ok({
      requestId: requestResult.requestId,
      documentNumber: preparedRemito.value.documentNumber,
      recipientEmail,
      expiresAt: requestResult.expiresAt,
      documentHash,
      reusedExistingRequest: requestResult.reusedExistingRequest,
    });
  }

  private async persistSigningRequest(input: {
    tenantId: string;
    rentalId: string;
    contractId: string;
    customerEmail: string | null;
    recipientEmail: string;
    signerName: string;
    tokenHash: string;
    documentHash: string;
    documentNumber: string;
    fileName: string;
    buffer: Buffer;
    now: Date;
    expiresAt: Date;
  }): Promise<PersistSigningRequestResult> {
    return this.prisma.client.$transaction(async (tx) => {
      const activeRequest = await tx.v2DocumentSigningRequest.findFirst({
        where: {
          tenantId: input.tenantId,
          contractId: input.contractId,
          status: {
            in: [
              V2DocumentSigningRequestStatus.PENDING,
              V2DocumentSigningRequestStatus.SENT,
              V2DocumentSigningRequestStatus.VIEWED,
            ],
          },
        },
        include: {
          unsignedArtifact: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (activeRequest?.expiresAt && activeRequest.expiresAt.getTime() <= input.now.getTime()) {
        await tx.v2DocumentSigningRequest.update({
          where: { id: activeRequest.id },
          data: {
            status: V2DocumentSigningRequestStatus.EXPIRED,
            tokenHash: null,
          },
        });
      } else if (activeRequest?.unsignedArtifact.documentHash === input.documentHash) {
        await tx.v2DocumentSigningRequest.update({
          where: { id: activeRequest.id },
          data: {
            signerName: input.signerName,
            signerEmail: input.recipientEmail,
            tokenHash: input.tokenHash,
            status: V2DocumentSigningRequestStatus.PENDING,
            expiresAt: input.expiresAt,
            sentAt: null,
            viewedAt: null,
            failedAt: null,
            cancelledAt: null,
          },
        });

        return {
          requestId: activeRequest.id,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          reusedExistingRequest: true,
        };
      } else if (activeRequest) {
        await tx.v2DocumentSigningRequest.update({
          where: { id: activeRequest.id },
          data: {
            status: V2DocumentSigningRequestStatus.CANCELLED,
            tokenHash: null,
            cancelledAt: input.now,
          },
        });
      }

      const artifactId = randomUUID();

      const storedPdf = await this.signingPdfStorageService.storeUnsignedPdf({
        tenantId: input.tenantId,
        contractId: input.contractId,
        rentalId: input.rentalId,
        artifactId,
        documentHash: input.documentHash,
        fileName: input.fileName,
        buffer: input.buffer,
      });

      const unsignedArtifact = await tx.v2ContractArtifact.create({
        data: {
          id: artifactId,
          tenantId: input.tenantId,
          contractId: input.contractId,
          kind: V2ContractArtifactKind.UNSIGNED_PDF,
          visibility: V2ContractArtifactVisibility.PUBLIC,
          storageKey: storedPdf.storageKey,
          fileName: storedPdf.fileName,
          contentType: storedPdf.contentType,
          byteSize: storedPdf.byteSize,
          hashAlgorithm: 'SHA-256',
          documentHash: input.documentHash,
        },
      });

      const signingRequest = await tx.v2DocumentSigningRequest.create({
        data: {
          tenantId: input.tenantId,
          contractId: input.contractId,
          rentalId: input.rentalId,
          unsignedArtifactId: unsignedArtifact.id,
          signerName: input.signerName,
          signerEmail: input.recipientEmail,
          signerPhone: null,
          tokenHash: input.tokenHash,
          status: V2DocumentSigningRequestStatus.PENDING,
          expiresAt: input.expiresAt,
          providerData: {
            documentNumber: input.documentNumber,
            originalCustomerEmail: input.customerEmail,
          },
        },
      });

      return {
        requestId: signingRequest.id,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        reusedExistingRequest: false,
      };
    });
  }
}

function translatePrepareRentalRemitoForSigningError(
  rentalId: string,
  error: RentalRemitoApplicationError,
): SendSigningInvitationCommandError {
  switch (error.code) {
    case 'CustomerProfileMissing':
    case 'TenantSignerMissing':
      return new SigningInvitationCustomerProfileMissingError(error.message);

    case 'CustomerEmailMissing':
      return new SigningInvitationRecipientEmailRequiredError(rentalId);

    case 'RentalNotFound':
      return new SigningInvitationOrderNotFoundError(rentalId);

    case 'RentalNotReady':
    case 'BranchContextMissing':
    case 'PriceSnapshotInvalid':
    case 'ContractAlreadySigned':
      return new SigningInvitationOrderNotReadyError(error.message);

    case 'Unexpected':
      throw new Error(error.message, { cause: error.cause });

    default:
      assertNever(error.code);
  }
}

function ensurePdfFileName(fileName: string): string {
  return fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
}

function normalizeRecipientEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();

  return normalized && normalized.length > 0 ? normalized : null;
}

function resolveSignerName(recipientEmail: string): string {
  return recipientEmail;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled rental remito signing error code: ${value}`);
}
