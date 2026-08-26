import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { V2NotificationChannel, V2NotificationDeliveryStatus } from 'src/generated/prisma/client';

import { NotificationChannelMutePolicy } from './notification-channel-mute-policy.service';
import { NotificationChannelPolicyResolver } from './notification-channel-policy.resolver';
import { NotificationPersistenceService, PersistedNotificationDelivery } from './notification-persistence.service';
import { EmailDeliveryFailure, EmailDeliveryPort, EmailRecipient } from './ports/email-delivery.port';
import { EmailRenderer, RenderedEmail } from './ports/email-renderer.port';
import { EmailSenderResolver } from './ports/email-sender.resolver';
import { TenantNotificationSuppressionPolicy } from './tenant-notification-suppression-policy.service';
import { NotificationDispatchRequest } from './types/notification-dispatch-request';
import { NotificationDispatchResult } from './types/notification-dispatch-result';
import { NotificationDispatchSkipReason } from './types/notification-dispatch-skip-reason.enum';
import { NotificationChannel } from '../domain/notification-channel.enum';
import { NotificationType } from '../domain/notification-type.enum';

@Injectable()
export class NotificationOrchestrator {
  constructor(
    private readonly channelPolicyResolver: NotificationChannelPolicyResolver,
    private readonly channelMutePolicy: NotificationChannelMutePolicy,
    private readonly tenantNotificationSuppressionPolicy: TenantNotificationSuppressionPolicy,
    private readonly notificationPersistence: NotificationPersistenceService,
    private readonly emailRenderer: EmailRenderer,
    private readonly emailDeliveryPort: EmailDeliveryPort,
    private readonly emailSenderResolver: EmailSenderResolver,
  ) {}

  async dispatch<T extends NotificationType>(
    request: NotificationDispatchRequest<T>,
  ): Promise<NotificationDispatchResult> {
    const channels = await this.channelPolicyResolver.resolveChannels(request.tenantId, request.notificationType);
    const result: NotificationDispatchResult = {
      attemptedChannels: [],
      deliveredChannels: [],
      skippedChannels: [],
      failedChannels: [],
    };

    const suppressionDecision = await this.tenantNotificationSuppressionPolicy.evaluate(
      request.tenantId,
      request.notificationType,
    );

    if (suppressionDecision.suppressed) {
      result.skippedChannels.push(
        ...channels.map((channel) => ({
          channel,
          reason: suppressionDecision.reason,
          message: suppressionDecision.message,
        })),
      );

      return result;
    }

    for (const channel of channels) {
      if (this.channelMutePolicy.isMuted(channel)) {
        result.skippedChannels.push({
          channel,
          reason: NotificationDispatchSkipReason.MUTED_BY_ENVIRONMENT,
          message: `Notification channel ${channel} is muted in the current environment.`,
        });
        continue;
      }

      switch (channel) {
        case NotificationChannel.EMAIL:
          await this.dispatchEmail(request, result);
          break;
        default:
          result.skippedChannels.push({
            channel,
            reason: NotificationDispatchSkipReason.UNSUPPORTED_CHANNEL,
            message: `Notification channel ${channel} is not supported by the orchestrator.`,
          });
          result.failedChannels.push({
            channel,
            reason: NotificationDispatchSkipReason.UNSUPPORTED_CHANNEL,
            message: `Notification channel ${channel} is not supported by the orchestrator.`,
          });
      }
    }

    return result;
  }

  private async dispatchEmail<T extends NotificationType>(
    request: NotificationDispatchRequest<T>,
    result: NotificationDispatchResult,
  ): Promise<void> {
    const recipients = this.distinctRecipients(request.emailRecipients);
    if (recipients.length === 0) {
      result.attemptedChannels.push(NotificationChannel.EMAIL);
      result.failedChannels.push({
        channel: NotificationChannel.EMAIL,
        reason: 'INVALID_MESSAGE',
        message: 'Email message must include at least one recipient.',
      });
      return;
    }

    const renderedEmail = await this.emailRenderer.render({
      notificationType: request.notificationType,
      tenantId: request.tenantId,
      payload: request.payload,
    });
    const sender = await this.emailSenderResolver.resolve(request.tenantId);
    const content = this.createContentSnapshot(renderedEmail, request.contentSnapshotRedactions);
    const notification = await this.notificationPersistence.createNotificationWithPendingDeliveries({
      tenantId: request.tenantId,
      notificationType: request.notificationType,
      content,
      source: request.source,
      metadata: request.metadata,
      idempotencyKey: request.idempotencyKey,
      deliveries: recipients.map((recipient) => ({
        channel: V2NotificationChannel.EMAIL,
        recipient: recipient.email,
      })),
    });

    if (!notification.created) {
      this.applyPersistedOutcome(notification.deliveries, result);
      return;
    }

    result.attemptedChannels.push(NotificationChannel.EMAIL);
    let hasDeliveredDelivery = false;

    for (const delivery of notification.deliveries) {
      const recipient = recipients.find((candidate) => candidate.email === delivery.recipient);
      if (!recipient) {
        throw new Error(`Persisted email delivery ${delivery.id} has no matching recipient.`);
      }

      const deliveryResult = await this.emailDeliveryPort.send({
        tenantId: request.tenantId,
        notificationType: request.notificationType,
        recipients: [recipient],
        sender,
        subject: renderedEmail.subject,
        html: renderedEmail.html,
        text: renderedEmail.text,
        metadata: request.metadata,
        idempotencyKey: this.deliveryIdempotencyKey(request.idempotencyKey, delivery.id),
      });

      if (deliveryResult.success) {
        await this.notificationPersistence.markDeliverySent({
          tenantId: request.tenantId,
          deliveryId: delivery.id,
          provider: deliveryResult.provider,
          providerMessageId: deliveryResult.providerMessageId,
        });
        hasDeliveredDelivery = true;
        continue;
      }

      await this.notificationPersistence.markDeliveryFailed({
        tenantId: request.tenantId,
        deliveryId: delivery.id,
        provider: deliveryResult.provider,
        errorCode: deliveryResult.reason,
        errorMessage: deliveryResult.message,
      });
      this.addFailedChannel(result, deliveryResult);
    }

    if (hasDeliveredDelivery) {
      result.deliveredChannels.push(NotificationChannel.EMAIL);
    }
  }

  private applyPersistedOutcome(
    deliveries: readonly PersistedNotificationDelivery[],
    result: NotificationDispatchResult,
  ): void {
    const emailDeliveries = deliveries.filter((delivery) => delivery.channel === V2NotificationChannel.EMAIL);

    if (emailDeliveries.some((delivery) => delivery.status === V2NotificationDeliveryStatus.PENDING)) {
      result.attemptedChannels.push(NotificationChannel.EMAIL);
    }
    if (emailDeliveries.some((delivery) => delivery.status === V2NotificationDeliveryStatus.SENT)) {
      result.deliveredChannels.push(NotificationChannel.EMAIL);
    }

    const failedDelivery = emailDeliveries.find((delivery) => delivery.status === V2NotificationDeliveryStatus.FAILED);
    if (failedDelivery) {
      result.failedChannels.push({
        channel: NotificationChannel.EMAIL,
        reason: this.toEmailFailureReason(failedDelivery.lastErrorCode),
        message: failedDelivery.lastErrorMessage ?? 'Email delivery failed.',
      });
    }
  }

  private createContentSnapshot(renderedEmail: RenderedEmail, redactions: readonly string[] | undefined) {
    const body = this.redactSnapshot(renderedEmail.html, redactions);

    return {
      subject: renderedEmail.subject,
      body,
      contentHash: createHash('sha256').update(body).digest('hex'),
    };
  }

  private redactSnapshot(content: string, redactions: readonly string[] | undefined): string {
    return (redactions ?? []).reduce((snapshot, value) => {
      if (!value) {
        return snapshot;
      }

      return snapshot.replaceAll(value, '[REDACTED]').replaceAll(this.escapeHtml(value), '[REDACTED]');
    }, content);
  }

  private distinctRecipients(recipients: readonly EmailRecipient[]): EmailRecipient[] {
    const seen = new Set<string>();

    return recipients.filter((recipient) => {
      if (seen.has(recipient.email)) {
        return false;
      }

      seen.add(recipient.email);
      return true;
    });
  }

  private deliveryIdempotencyKey(
    notificationIdempotencyKey: string | undefined,
    deliveryId: string,
  ): string | undefined {
    return notificationIdempotencyKey ? `${notificationIdempotencyKey}:${deliveryId}` : undefined;
  }

  private addFailedChannel(result: NotificationDispatchResult, failure: EmailDeliveryFailure): void {
    if (result.failedChannels.some((channelFailure) => channelFailure.channel === NotificationChannel.EMAIL)) {
      return;
    }

    result.failedChannels.push({
      channel: NotificationChannel.EMAIL,
      reason: failure.reason,
      message: failure.message,
    });
  }

  private toEmailFailureReason(errorCode: string | null): EmailDeliveryFailure['reason'] {
    return errorCode === 'INVALID_MESSAGE' ? 'INVALID_MESSAGE' : 'PROVIDER_ERROR';
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
