import { createHash, randomBytes, randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { Env } from 'src/config/env.schema';
import { DocumentSigningRequest } from 'src/modules/document-signing/domain/entities/document-signing-request.entity';
import { V2ContractsPublicApi } from 'src/modules/contracts/public-api/contracts.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { DocumentSigningRequestRepository } from 'src/modules/document-signing/infrastructure/persistence/repositories/document-signing-request.repository';

import { SigningNotificationService } from '../../application/services/signing-notification.service';
import { SigningRequestPdfStorageService } from '../../application/services/signing-request-pdf-storage.service';
import { hashSigningDocument } from '../../application/signing-document-hash';
import { SendSigningInvitationCommand } from './send-signing-invitation.command';
import { SendSigningInvitationInput, SendSigningInvitationResult } from './send-signing-invitation.contract';
import { sendSigningInvitationError, SendSigningInvitationError } from './send-signing-invitation.errors';

export type SendSigningInvitationCommandError = SendSigningInvitationError;

@Injectable()
@CommandHandler(SendSigningInvitationCommand)
export class SendSigningInvitationService implements ICommandHandler<
  SendSigningInvitationCommand,
  Result<SendSigningInvitationResult, SendSigningInvitationCommandError>
> {
  private readonly signingRequestTtlSeconds: number;

  constructor(
    private readonly documentSigningRequestRepository: DocumentSigningRequestRepository,
    private readonly signingNotificationService: SigningNotificationService,
    private readonly signingRequestPdfStorageService: SigningRequestPdfStorageService,
    private readonly contractsPublicApi: V2ContractsPublicApi,
    private readonly tenantManagementPublicApi: TenantManagementPublicApi,
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

    const preparedOrder = await this.contractsPublicApi.prepareRentalRemitoForSigning({
      tenantId: input.tenantId,
      rentalId: input.orderId,
    });

    if (preparedOrder.isErr()) {
      return err(translatePrepareOrderAgreementForSigningError(input.orderId, preparedOrder.error));
    }

    const tenant = await this.tenantManagementPublicApi.getTenant({ tenantId: input.tenantId });
    if (tenant.isErr()) {
      throw new Error(`Tenant '${input.tenantId}' was not found.`);
    }

    const recipientEmail =
      normalizeRecipientEmail(input.recipientEmail) ?? normalizeRecipientEmail(preparedOrder.value.customerEmail);
    if (!recipientEmail) {
      return err(
        sendSigningInvitationError(
          'document_signing.recipient_email_required',
          `Order '${input.orderId}' must provide a recipient email before a signing invitation can be sent.`,
          undefined,
          { useCase: 'SendSigningInvitation', tenantId: input.tenantId, orderId: input.orderId },
        ),
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.signingRequestTtlSeconds * 1000);
    const documentHash = hashSigningDocument(preparedOrder.value.buffer);
    const rawToken = generateRawSigningToken();
    const tokenHash = hashString(rawToken);
    const pdfFileName = `${preparedOrder.value.fileName}.pdf`;

    const requestResult = await this.documentSigningRequestRepository.runWithActiveRequestLock(
      input.tenantId,
      input.orderId,
      input.documentType,
      async (tx) => {
        const pendingRequest = await this.documentSigningRequestRepository.findPendingForOrderDocument(
          input.tenantId,
          input.orderId,
          input.documentType,
          tx,
        );

        if (pendingRequest && pendingRequest.expiresOn.getTime() <= now.getTime()) {
          const expireResult = pendingRequest.expire(now);
          if (expireResult.isErr()) {
            throw expireResult.error;
          }

          await this.documentSigningRequestRepository.save(pendingRequest, tx);
        } else if (pendingRequest && pendingRequest.documentHash === documentHash) {
          const refreshResult = pendingRequest.refreshPendingInvitation({ recipientEmail, tokenHash, expiresAt }, now);
          if (refreshResult.isErr()) {
            throw refreshResult.error;
          }

          await this.documentSigningRequestRepository.save(pendingRequest, tx);

          return {
            requestId: pendingRequest.id,
            expiresAt: pendingRequest.expiresOn,
            tokenHash,
            reusedExistingRequest: true,
          };
        } else if (pendingRequest) {
          const voidResult = pendingRequest.void(now);
          if (voidResult.isErr()) {
            throw voidResult.error;
          }

          await this.documentSigningRequestRepository.save(pendingRequest, tx);
        }

        const requestId = randomUUID();
        const storedPdf = await this.signingRequestPdfStorageService.storeUnsignedPdf({
          tenantId: input.tenantId,
          orderId: input.orderId,
          requestId,
          documentType: input.documentType,
          documentHash,
          fileName: pdfFileName,
          buffer: preparedOrder.value.buffer,
        });

        const request = DocumentSigningRequest.createPending({
          id: requestId,
          tenantId: input.tenantId,
          orderId: input.orderId,
          customerId: preparedOrder.value.customerId,
          documentType: input.documentType,
          documentNumber: preparedOrder.value.documentNumber,
          recipientEmail,
          tokenHash,
          documentHash,
          pdfStorageKey: storedPdf.storageKey,
          pdfFileName: storedPdf.fileName,
          pdfContentType: storedPdf.contentType,
          pdfByteSize: storedPdf.byteSize,
          expiresAt,
        });

        await this.documentSigningRequestRepository.save(request, tx);

        return {
          requestId: request.id,
          expiresAt: request.expiresOn,
          tokenHash,
          reusedExistingRequest: false,
        };
      },
    );

    const deliveryResult = await this.signingNotificationService.sendInvitation({
      tenant: tenant.value,
      requestId: requestResult.requestId,
      orderId: input.orderId,
      documentType: input.documentType,
      documentNumber: preparedOrder.value.documentNumber,
      rawToken,
      tokenHash: requestResult.tokenHash,
      recipientEmail,
      expiresAt: requestResult.expiresAt,
      resend: requestResult.reusedExistingRequest,
    });

    if (deliveryResult.deliveryError) {
      return err(
        sendSigningInvitationError(
          'document_signing.invitation_delivery_failed',
          deliveryResult.deliveryError.message,
          deliveryResult.deliveryError,
          { useCase: 'SendSigningInvitation', tenantId: input.tenantId, orderId: input.orderId },
        ),
      );
    }

    return ok({
      requestId: requestResult.requestId,
      documentNumber: preparedOrder.value.documentNumber,
      recipientEmail,
      expiresAt: requestResult.expiresAt,
      documentHash,
      reusedExistingRequest: requestResult.reusedExistingRequest,
    });
  }
}

function translatePrepareOrderAgreementForSigningError(
  orderId: string,
  error: { code: string; message: string; cause?: unknown },
): SendSigningInvitationCommandError {
  switch (error.code) {
    case 'CustomerProfileMissing':
      return sendSigningInvitationError('document_signing.customer_profile_missing', error.message, error, { orderId });
    case 'RentalNotFound':
      return sendSigningInvitationError(
        'document_signing.order_not_found',
        `Order '${orderId}' was not found.`,
        error,
        { orderId },
      );
    case 'RentalNotReady':
      return sendSigningInvitationError('document_signing.order_not_ready', error.message, error, { orderId });
    default:
      throw error;
  }
}

function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function generateRawSigningToken(): string {
  return randomBytes(32).toString('hex');
}

function normalizeRecipientEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}
