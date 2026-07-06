import { Module } from '@nestjs/common';

import { TenantManagementModule } from 'src/modules/tenant-management/tenant-management.module';

import { EmailDeliveryPort } from './application/ports/email-delivery.port';
import { EmailRenderer } from './application/ports/email-renderer.port';
import { EmailSenderResolver } from './application/ports/email-sender.resolver';
import { SendOrderCreatedConfirmationNotificationHandler } from './application/event-handlers/send-order-created-confirmation-notification.event-handler';
import { SendOrderCreatedByCustomerNotificationHandler } from './application/event-handlers/send-order-created-by-customer-notification.event-handler';
import { SendOrderCancelledNotificationHandler } from './application/event-handlers/send-order-cancelled-notification.event-handler';
import { NotificationChannelMutePolicy } from './application/notification-channel-mute-policy.service';
import { NotificationOrchestrator } from './application/notification-orchestrator.service';
import { NotificationChannelPolicyResolver } from './application/notification-channel-policy.resolver';
import { TenantNotificationSuppressionPolicy } from './application/tenant-notification-suppression-policy.service';
import { ResendEmailDeliveryAdapter } from './infrastructure/delivery/resend-email-delivery.adapter';
import { CodeBasedEmailRendererService } from './infrastructure/rendering/code-based-email-renderer.service';
import { PlatformEmailSenderResolver } from './infrastructure/sender/platform-email-sender.resolver';

@Module({
  imports: [TenantManagementModule],
  providers: [
    NotificationOrchestrator,
    NotificationChannelPolicyResolver,
    NotificationChannelMutePolicy,
    TenantNotificationSuppressionPolicy,
    SendOrderCreatedConfirmationNotificationHandler,
    SendOrderCreatedByCustomerNotificationHandler,
    SendOrderCancelledNotificationHandler,
    CodeBasedEmailRendererService,
    ResendEmailDeliveryAdapter,
    PlatformEmailSenderResolver,
    { provide: EmailRenderer, useExisting: CodeBasedEmailRendererService },
    { provide: EmailDeliveryPort, useExisting: ResendEmailDeliveryAdapter },
    { provide: EmailSenderResolver, useExisting: PlatformEmailSenderResolver },
  ],
  exports: [NotificationOrchestrator, NotificationChannelPolicyResolver, EmailRenderer, EmailDeliveryPort],
})
export class NotificationsModule {}
