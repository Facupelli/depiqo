import { NotificationType } from '../../domain/notification-type.enum';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailSender {
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
}

export interface EmailMessage {
  tenantId: string;
  notificationType: NotificationType;
  recipients: EmailRecipient[];
  sender: EmailSender;
  subject: string;
  html: string;
  text: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}

export interface EmailDeliverySuccess {
  success: true;
  provider: string;
  providerMessageId?: string;
}

export interface EmailDeliveryFailure {
  success: false;
  provider: string;
  reason: 'PROVIDER_ERROR' | 'INVALID_MESSAGE';
  message: string;
}

export type EmailDeliveryResult = EmailDeliverySuccess | EmailDeliveryFailure;

export abstract class EmailDeliveryPort {
  abstract send(message: EmailMessage): Promise<EmailDeliveryResult>;
}
