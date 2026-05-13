import { NotificationChannel } from '../../domain/notification-channel.enum';
import { EmailDeliveryFailure } from '../ports/email-delivery.port';
import { NotificationDispatchSkipReason } from './notification-dispatch-skip-reason.enum';

export interface NotificationChannelFailure {
  channel: NotificationChannel;
  reason: EmailDeliveryFailure['reason'] | NotificationDispatchSkipReason.UNSUPPORTED_CHANNEL;
  message: string;
}

export interface SkippedNotificationChannel {
  channel: NotificationChannel;
  reason: NotificationDispatchSkipReason;
  message: string;
}

export interface NotificationDispatchResult {
  attemptedChannels: NotificationChannel[];
  deliveredChannels: NotificationChannel[];
  skippedChannels: SkippedNotificationChannel[];
  failedChannels: NotificationChannelFailure[];
}
