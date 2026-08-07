import { FulfillmentMethod, RentalStatus } from 'src/modules/rental-commitment/domain/rental-status';

import { NotificationType } from '../../domain/notification-type.enum';

export interface PasswordResetEmailPayload {
  resetUrl: string;
  recipientName?: string;
  tenantName?: string;
  expiresAt?: Date;
}

export interface DocumentSigningInvitationEmailPayload {
  tenantName?: string;
  documentLabel: string;
  documentNumber: string;
  signingUrl: string;
  expiresAt: Date;
  isReplacement: boolean;
}

export interface RentalCancelledEmailPayload {
  tenantName?: string;
  recipientName?: string;
}

export interface RentalCreatedByCustomerEmailPayload {
  tenantName?: string;
  rentalNumber: number | string;
  customerEmail: string;
  status: RentalStatus;
  fulfillmentMethod: FulfillmentMethod;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  locationName?: string;
  timezone?: string;
}

export interface RentalConfirmedConfirmationEmailPayload {
  tenantName?: string;
  rentalNumber: number | string;
  status: RentalStatus;
  fulfillmentMethod: FulfillmentMethod;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
}

export type ConfirmedRentalEditedEmailPayload = RentalConfirmedConfirmationEmailPayload;

export interface NotificationEmailPayloadMap {
  [NotificationType.RENTAL_CONFIRMED_CONFIRMATION]: RentalConfirmedConfirmationEmailPayload;
  [NotificationType.CONFIRMED_RENTAL_EDITED]: ConfirmedRentalEditedEmailPayload;
  [NotificationType.RENTAL_CREATED_BY_CUSTOMER]: RentalCreatedByCustomerEmailPayload;
  [NotificationType.RENTAL_CANCELLED]: RentalCancelledEmailPayload;
  [NotificationType.DOCUMENT_SIGNING_INVITATION]: DocumentSigningInvitationEmailPayload;
  [NotificationType.PASSWORD_RESET]: PasswordResetEmailPayload;
}

export type RenderEmailInput<T extends NotificationType = NotificationType> = {
  notificationType: T;
  tenantId: string;
  payload: NotificationEmailPayloadMap[T];
};

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export abstract class EmailRenderer {
  abstract render<T extends NotificationType>(input: RenderEmailInput<T>): Promise<RenderedEmail>;
}
