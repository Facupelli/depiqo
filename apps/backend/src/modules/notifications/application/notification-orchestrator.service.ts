import { Injectable } from '@nestjs/common';

import { NotificationChannelMutePolicy } from './notification-channel-mute-policy.service';
import { NotificationChannelPolicyResolver } from './notification-channel-policy.resolver';
import { EmailDeliveryPort } from './ports/email-delivery.port';
import { EmailRenderer } from './ports/email-renderer.port';
import { EmailSenderResolver } from './ports/email-sender.resolver';
import { NotificationDispatchRequest } from './types/notification-dispatch-request';
import { NotificationDispatchResult } from './types/notification-dispatch-result';
import { NotificationDispatchSkipReason } from './types/notification-dispatch-skip-reason.enum';
import { NotificationType } from '../domain/notification-type.enum';
import { NotificationChannel } from '../domain/notification-channel.enum';

@Injectable()
export class NotificationOrchestrator {
  constructor(
    private readonly channelPolicyResolver: NotificationChannelPolicyResolver,
    private readonly channelMutePolicy: NotificationChannelMutePolicy,
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
        case NotificationChannel.EMAIL: {
          result.attemptedChannels.push(channel);

          const renderedEmail = await this.emailRenderer.render({
            notificationType: request.notificationType,
            tenantId: request.tenantId,
            payload: request.payload,
          });
          const sender = await this.emailSenderResolver.resolve(request.tenantId);
          const deliveryResult = await this.emailDeliveryPort.send({
            tenantId: request.tenantId,
            notificationType: request.notificationType,
            recipients: request.emailRecipients,
            sender,
            subject: renderedEmail.subject,
            html: renderedEmail.html,
            text: renderedEmail.text,
            metadata: request.metadata,
            idempotencyKey: request.idempotencyKey,
          });

          if (deliveryResult.success) {
            result.deliveredChannels.push(channel);
          } else {
            result.failedChannels.push({
              channel,
              reason: deliveryResult.reason,
              message: deliveryResult.message,
            });
          }
          break;
        }
        default: {
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
    }

    return result;
  }
}
