import { createHash, randomBytes, randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { TenantContext } from '@repo/schemas';
import { Result, err, ok } from 'neverthrow';

import { Env } from 'src/config/env.schema';
import { PrepareOrderAgreementForSigningQuery } from 'src/modules/order/public/queries/prepare-order-agreement-for-signing.query';
import { OrderAgreementForSigningReadModel } from 'src/modules/order/public/read-models/order-agreement-for-signing.read-model';
import { FindTenantByIdQuery } from 'src/modules/tenant/public/queries/find-tenant-by-id.query';
import { DocumentSigningRequest } from 'src/modules/document-signing/domain/entities/document-signing-request.entity';
import {
  SigningInvitationCustomerProfileMissingError,
  SigningInvitationEmailDeliveryFailedError,
  SigningInvitationOrderNotFoundError,
  SigningInvitationOrderNotReadyError,
  SigningInvitationRecipientEmailRequiredError,
} from 'src/modules/document-signing/domain/errors/document-signing.errors';
import { DocumentSigningRequestRepository } from 'src/modules/document-signing/infrastructure/persistence/repositories/document-signing-request.repository';

import { SigningNotificationService } from '../../services/signing-notification.service';
import { SigningRequestPdfStorageService } from '../../services/signing-request-pdf-storage.service';
import { hashSigningDocument } from '../../signing-document-hash';
import { SendSigningInvitationCommand } from './send-signing-invitation.command';
import { SendSigningInvitationInput, SendSigningInvitationResult } from './send-signing-invitation.contract';

export type SendSigningInvitationCommandError =
  | SigningInvitationCustomerProfileMissingError
  | SigningInvitationOrderNotFoundError
  | SigningInvitationOrderNotReadyError
  | SigningInvitationRecipientEmailRequiredError
  | SigningInvitationEmailDeliveryFailedError;

type PrepareOrderAgreementForSigningResult = Result<OrderAgreementForSigningReadModel, Error>;

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
    private readonly queryBus: QueryBus,
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

    const preparedOrder = await this.queryBus.execute<
      PrepareOrderAgreementForSigningQuery,
      PrepareOrderAgreementForSigningResult
    >(new PrepareOrderAgreementForSigningQuery(input.tenantId, input.orderId));

    if (preparedOrder.isErr()) {
      return err(translatePrepareOrderAgreementForSigningError(input.orderId, preparedOrder.error));
    }

    const tenant = await this.queryBus.execute<FindTenantByIdQuery, TenantContext | null>(
      new FindTenantByIdQuery(input.tenantId),
    );
    if (!tenant) {
      throw new Error(`Tenant '${input.tenantId}' was not found.`);
    }

    const recipientEmail =
      normalizeRecipientEmail(input.recipientEmail) ?? normalizeRecipientEmail(preparedOrder.value.customerEmail);
    if (!recipientEmail) {
      return err(new SigningInvitationRecipientEmailRequiredError(input.orderId));
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
      tenant,
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
      return err(deliveryResult.deliveryError);
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
  error: Error,
): SendSigningInvitationCommandError {
  switch (error.constructor.name) {
    case 'ContractCustomerProfileMissingError':
      return new SigningInvitationCustomerProfileMissingError(error.message);
    case 'OrderNotFoundError':
      return new SigningInvitationOrderNotFoundError(orderId);
    case 'OrderSigningAllowedOnlyForConfirmedOrdersError':
      return new SigningInvitationOrderNotReadyError(error.message);
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
