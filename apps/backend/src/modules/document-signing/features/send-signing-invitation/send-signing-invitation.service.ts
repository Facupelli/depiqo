import { createHash, randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { Env } from 'src/config/env.schema';
import { V2ContractsPublicApi } from 'src/modules/contracts/public-api/contracts.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';
import { SigningNotificationService } from '../../application/services/signing-notification.service';
import { SendSigningInvitationCommand } from './send-signing-invitation.command';
import { SendSigningInvitationInput, SendSigningInvitationResult } from './send-signing-invitation.contract';
import { sendSigningInvitationError, SendSigningInvitationError } from './send-signing-invitation.errors';

export type SendSigningInvitationCommandError = SendSigningInvitationError;

@Injectable()
@CommandHandler(SendSigningInvitationCommand)
export class SendSigningInvitationService implements ICommandHandler<
  SendSigningInvitationCommand,
  Result<SendSigningInvitationResult, SendSigningInvitationError>
> {
  constructor(
    private readonly signingNotificationService: SigningNotificationService,
    private readonly contracts: V2ContractsPublicApi,
    private readonly tenants: TenantManagementPublicApi,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async execute(
    command: SendSigningInvitationCommand,
  ): Promise<Result<SendSigningInvitationResult, SendSigningInvitationError>> {
    const input: SendSigningInvitationInput = command;
    const prepared = await this.contracts.prepareRentalRemitoForSigning({
      tenantId: input.tenantId,
      rentalId: input.orderId,
    });
    if (prepared.isErr())
      return err(
        sendSigningInvitationError('document_signing.order_not_ready', prepared.error.message, prepared.error),
      );
    const recipientEmail = input.recipientEmail?.trim().toLowerCase() || prepared.value.customerEmail;
    if (!recipientEmail)
      return err(
        sendSigningInvitationError('document_signing.recipient_email_required', 'A recipient email is required.'),
      );
    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.config.get('DOCUMENT_SIGNING_SESSION_TTL_SECONDS') * 1000);
    const request = await this.contracts.createRentalRemitoSigningRequest({
      tenantId: input.tenantId,
      contractId: prepared.value.contractId,
      unsignedArtifactId: prepared.value.unsignedArtifactId,
      recipientEmail,
      tokenHash: createHash('sha256').update(rawToken).digest('hex'),
      expiresAt,
    });
    if (request.isErr())
      return err(sendSigningInvitationError('document_signing.order_not_ready', request.error.message, request.error));
    const tenant = await this.tenants.getTenant({ tenantId: input.tenantId });
    if (tenant.isErr()) throw new Error(`Tenant '${input.tenantId}' was not found.`);
    const delivery = await this.signingNotificationService.sendInvitation({
      tenant: tenant.value,
      requestId: request.value.requestId,
      orderId: input.orderId,
      documentType: input.documentType,
      documentNumber: prepared.value.documentNumber,
      rawToken,
      tokenHash: createHash('sha256').update(rawToken).digest('hex'),
      recipientEmail,
      expiresAt: request.value.expiresAt,
      resend: request.value.reusedExistingRequest,
    });
    if (delivery.deliveryError)
      return err(
        sendSigningInvitationError(
          'document_signing.invitation_delivery_failed',
          delivery.deliveryError.message,
          delivery.deliveryError,
        ),
      );
    return ok({
      requestId: request.value.requestId,
      documentNumber: prepared.value.documentNumber,
      recipientEmail,
      expiresAt: request.value.expiresAt,
      documentHash: prepared.value.documentHash,
      reusedExistingRequest: request.value.reusedExistingRequest,
    });
  }
}
