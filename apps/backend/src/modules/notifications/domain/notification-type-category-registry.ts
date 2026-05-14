import { NotificationType } from './notification-type.enum';
import { NotificationTypeCategory } from './notification-type-category.enum';

const notificationTypeCategoryRegistry: Record<NotificationType, NotificationTypeCategory> = {
  [NotificationType.ORDER_CREATED_CONFIRMATION]: NotificationTypeCategory.TENANT_WORKFLOW,
  [NotificationType.ORDER_CREATED_BY_CUSTOMER]: NotificationTypeCategory.TENANT_WORKFLOW,
  [NotificationType.ORDER_CANCELLED]: NotificationTypeCategory.TENANT_WORKFLOW,
  [NotificationType.DOCUMENT_SIGNING_INVITATION]: NotificationTypeCategory.TENANT_WORKFLOW,
  [NotificationType.PASSWORD_RESET]: NotificationTypeCategory.PLATFORM_OPERATIONAL,
};

export function getNotificationTypeCategory(notificationType: NotificationType): NotificationTypeCategory {
  return notificationTypeCategoryRegistry[notificationType];
}
