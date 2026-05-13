import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '@repo/schemas';

import { Env } from 'src/config/env.schema';
import { SigningDocumentType } from 'src/generated/prisma/client';
import { NotificationOrchestrator } from 'src/modules/notifications/application/notification-orchestrator.service';
import { NotificationDispatchSkipReason } from 'src/modules/notifications/application/types/notification-dispatch-skip-reason.enum';
import { NotificationChannel } from 'src/modules/notifications/domain/notification-channel.enum';
import { NotificationType } from 'src/modules/notifications/domain/notification-type.enum';

import { SigningInvitationEmailDeliveryFailedError } from '../../domain/errors/document-signing.errors';

export type SigningInvitationDeliveryResult =
  | {
      signingUrl: string;
      delivered: true;
      failureReason: null;
      failureMessage: null;
      deliveryError: null;
    }
  | {
      signingUrl: string;
      delivered: false;
      failureReason: string;
      failureMessage: string;
      deliveryError: SigningInvitationEmailDeliveryFailedError;
    };

@Injectable()
export class SigningNotificationService {
  private readonly rootDomain: string;

  constructor(
    private readonly notificationOrchestrator: NotificationOrchestrator,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.rootDomain = this.configService.get('ROOT_DOMAIN');
  }

  async sendInvitation(input: {
    tenant: TenantContext;
    requestId: string;
    orderId: string;
    documentType: SigningDocumentType;
    documentNumber: string;
    rawToken: string;
    tokenHash: string;
    recipientEmail: string;
    expiresAt: Date;
    resend: boolean;
  }): Promise<SigningInvitationDeliveryResult> {
    const signingUrl = this.buildPortalSigningUrl(input.tenant, input.rawToken);
    const dispatchResult = await this.notificationOrchestrator.dispatch({
      tenantId: input.tenant.id,
      notificationType: NotificationType.DOCUMENT_SIGNING_INVITATION,
      emailRecipients: [{ email: input.recipientEmail }],
      payload: {
        tenantName: input.tenant.name,
        documentLabel: this.getSigningDocumentLabel(input.documentType),
        documentNumber: input.documentNumber,
        signingUrl,
        expiresAt: input.expiresAt,
        isReplacement: input.resend,
      },
      metadata: {
        orderId: input.orderId,
        signingRequestId: input.requestId,
        documentType: input.documentType,
      },
      idempotencyKey: `signing-invitation:${input.requestId}:${input.tokenHash}`,
    });

    if (dispatchResult.deliveredChannels.includes(NotificationChannel.EMAIL)) {
      return {
        signingUrl,
        delivered: true,
        failureReason: null,
        failureMessage: null,
        deliveryError: null,
      };
    }

    const skippedEmail = dispatchResult.skippedChannels.find(
      (skippedChannel) => skippedChannel.channel === NotificationChannel.EMAIL,
    );

    if (skippedEmail?.reason === NotificationDispatchSkipReason.MUTED_BY_ENVIRONMENT) {
      return {
        signingUrl,
        delivered: true,
        failureReason: null,
        failureMessage: null,
        deliveryError: null,
      };
    }

    const failure = dispatchResult.failedChannels[0];
    const failureReason = failure?.reason ?? 'NO_CHANNEL_DELIVERED';
    const failureMessage = failure?.message ?? 'No notification channel delivered the invitation.';
    const message = failure
      ? `Signing invitation email delivery failed: ${failure.message}`
      : 'Signing invitation email delivery failed: no notification channel delivered the invitation.';

    return {
      signingUrl,
      delivered: false,
      failureReason,
      failureMessage,
      deliveryError: new SigningInvitationEmailDeliveryFailedError(message),
    };
  }

  private buildPortalSigningUrl(tenant: TenantContext, rawToken: string): string {
    const hostname = tenant.customDomain ?? `${tenant.slug}.${this.rootDomain}`;
    return `https://${hostname}/signing?token=${encodeURIComponent(rawToken)}`;
  }

  private getSigningDocumentLabel(documentType: SigningDocumentType): string {
    switch (documentType) {
      case SigningDocumentType.RENTAL_AGREEMENT:
        return 'acuerdo de alquiler';
      default:
        return 'documento';
    }
  }
}
