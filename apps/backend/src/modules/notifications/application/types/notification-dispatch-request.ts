import { EmailRecipient } from '../ports/email-delivery.port';
import { NotificationEmailPayloadMap } from '../ports/email-renderer.port';
import { NotificationType } from '../../domain/notification-type.enum';

export type NotificationSourceCorrelation = {
  context: string;
  aggregateType: string;
  aggregateId: string;
  eventId?: string;
};

export type NotificationDispatchRequest<T extends NotificationType = NotificationType> = {
  tenantId: string;
  notificationType: T;
  emailRecipients: EmailRecipient[];
  payload: NotificationEmailPayloadMap[T];
  source?: NotificationSourceCorrelation;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
  /** Values that must not be retained in the persisted content snapshot. */
  contentSnapshotRedactions?: readonly string[];
};
