import { createHash, randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { Env } from 'src/config/env.schema';
import { TenantIdentityFacts } from 'src/modules/tenant-management/public-api/tenant-identity-facts.public-api';

import { RentalRemitoSigningNotificationService } from '../../application/rental-remito/rental-remito-signing-notification.service';
import { RentalRemitoSigningRequestService } from '../../application/rental-remito/rental-remito-signing-request.service';
import { PrepareRentalRemitoForSigningResult } from '../prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.handler';
import { PrepareRentalRemitoForSigningQuery } from '../prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.query';
import { SendRentalRemitoSigningInvitationCommand } from './send-rental-remito-signing-invitation.command';
import {
  SendRentalRemitoSigningInvitationInput,
  SendRentalRemitoSigningInvitationResult,
} from './send-rental-remito-signing-invitation.contract';
import {
  sendRentalRemitoSigningInvitationError,
  SendRentalRemitoSigningInvitationError,
} from './send-rental-remito-signing-invitation.errors';

export type SendRentalRemitoSigningInvitationCommandError = SendRentalRemitoSigningInvitationError;

@Injectable()
@CommandHandler(SendRentalRemitoSigningInvitationCommand)
export class SendRentalRemitoSigningInvitationService implements ICommandHandler<
  SendRentalRemitoSigningInvitationCommand,
  Result<SendRentalRemitoSigningInvitationResult, SendRentalRemitoSigningInvitationError>
> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly signingRequestService: RentalRemitoSigningRequestService,
    private readonly signingNotificationService: RentalRemitoSigningNotificationService,
    private readonly tenantIdentityFacts: TenantIdentityFacts,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async execute(
    command: SendRentalRemitoSigningInvitationCommand,
  ): Promise<Result<SendRentalRemitoSigningInvitationResult, SendRentalRemitoSigningInvitationError>> {
    const input: SendRentalRemitoSigningInvitationInput = command;
    const prepared = await this.queryBus.execute<
      PrepareRentalRemitoForSigningQuery,
      PrepareRentalRemitoForSigningResult
    >(new PrepareRentalRemitoForSigningQuery(input.tenantId, input.orderId));
    if (prepared.isErr()) {
      return err(
        sendRentalRemitoSigningInvitationError(
          'document_signing.order_not_ready',
          prepared.error.message,
          prepared.error,
        ),
      );
    }

    const recipientEmail = input.recipientEmail?.trim().toLowerCase() || prepared.value.customerEmail;
    if (!recipientEmail) {
      return err(
        sendRentalRemitoSigningInvitationError(
          'document_signing.recipient_email_required',
          'A recipient email is required.',
        ),
      );
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + this.config.get('DOCUMENT_SIGNING_SESSION_TTL_SECONDS') * 1000);
    const request = await this.signingRequestService.createOrReuse({
      tenantId: input.tenantId,
      contractId: prepared.value.contractId,
      unsignedArtifactId: prepared.value.unsignedArtifactId,
      recipientEmail,
      tokenHash,
      expiresAt,
    });
    if (request.isErr()) {
      return err(
        sendRentalRemitoSigningInvitationError(
          'document_signing.order_not_ready',
          request.error.message,
          request.error,
        ),
      );
    }

    const tenant = await this.tenantIdentityFacts.getTenantIdentityFacts({ tenantId: input.tenantId });
    if (tenant.isErr()) throw new Error(`Tenant '${input.tenantId}' was not found.`);

    const delivery = await this.signingNotificationService.sendInvitation({
      tenant: tenant.value,
      requestId: request.value.requestId,
      orderId: input.orderId,
      documentType: input.documentType,
      documentNumber: prepared.value.documentNumber,
      rawToken,
      tokenHash,
      recipientEmail,
      expiresAt: request.value.expiresAt,
      resend: request.value.reusedExistingRequest,
    });
    if (delivery.deliveryError) {
      return err(
        sendRentalRemitoSigningInvitationError(
          'document_signing.invitation_delivery_failed',
          delivery.deliveryError.message,
          delivery.deliveryError,
        ),
      );
    }

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
