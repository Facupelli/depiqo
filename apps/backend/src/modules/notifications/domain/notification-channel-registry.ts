import { NotificationChannel } from './notification-channel.enum';
import { NotificationType } from './notification-type.enum';

const notificationChannelRegistry: Record<NotificationType, readonly NotificationChannel[]> = {
  [NotificationType.RENTAL_CONFIRMED_CONFIRMATION]: [NotificationChannel.EMAIL],
  [NotificationType.CONFIRMED_RENTAL_EDITED]: [NotificationChannel.EMAIL],
  [NotificationType.RENTAL_CREATED_BY_CUSTOMER]: [NotificationChannel.EMAIL],
  [NotificationType.RENTAL_CANCELLED]: [NotificationChannel.EMAIL],
  [NotificationType.DOCUMENT_SIGNING_INVITATION]: [NotificationChannel.EMAIL],
  [NotificationType.PASSWORD_RESET]: [NotificationChannel.EMAIL],
};

export function getAllowedChannelsForNotificationType(
  notificationType: NotificationType,
): readonly NotificationChannel[] {
  return notificationChannelRegistry[notificationType];
}
