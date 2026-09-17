import { Injectable } from '@nestjs/common';

import {
  EmailRenderer,
  NotificationEmailPayloadMap,
  RenderEmailInput,
  RenderedEmail,
} from '../../application/ports/email-renderer.port';
import { NotificationType } from '../../domain/notification-type.enum';
import { renderConfirmedRentalEditedEmailTemplate } from './templates/confirmed-rental-edited-email.template';
import { renderDocumentSigningInvitationEmailTemplate } from './templates/document-signing-invitation-email.template';
import { renderRentalCancelledEmailTemplate } from './templates/rental-cancelled-email.template';
import { renderRentalConfirmedConfirmationEmailTemplate } from './templates/rental-confirmed-confirmation-email.template';
import { renderRentalCreatedByCustomerEmailTemplate } from './templates/rental-created-by-customer-email.template';
import { renderPasswordResetEmailTemplate } from './templates/password-reset-email.template';

const emailTemplateRenderers = {
  [NotificationType.RENTAL_CONFIRMED_CONFIRMATION]: renderRentalConfirmedConfirmationEmailTemplate,
  [NotificationType.CONFIRMED_RENTAL_EDITED]: renderConfirmedRentalEditedEmailTemplate,
  [NotificationType.RENTAL_CREATED_BY_CUSTOMER]: renderRentalCreatedByCustomerEmailTemplate,
  [NotificationType.RENTAL_CANCELLED]: renderRentalCancelledEmailTemplate,
  [NotificationType.DOCUMENT_SIGNING_INVITATION]: renderDocumentSigningInvitationEmailTemplate,
  [NotificationType.PASSWORD_RESET]: renderPasswordResetEmailTemplate,
} satisfies {
  [T in NotificationType]: (payload: NotificationEmailPayloadMap[T]) => Promise<RenderedEmail> | RenderedEmail;
};

type AnyRenderEmailInput = {
  [T in NotificationType]: RenderEmailInput<T>;
}[NotificationType];

@Injectable()
export class CodeBasedEmailRendererService implements EmailRenderer {
  async render<T extends NotificationType>(input: RenderEmailInput<T>): Promise<RenderedEmail>;
  async render(input: AnyRenderEmailInput): Promise<RenderedEmail> {
    switch (input.notificationType) {
      case NotificationType.RENTAL_CONFIRMED_CONFIRMATION:
        return await emailTemplateRenderers[input.notificationType](input.payload);
      case NotificationType.CONFIRMED_RENTAL_EDITED:
        return await emailTemplateRenderers[input.notificationType](input.payload);
      case NotificationType.RENTAL_CREATED_BY_CUSTOMER:
        return await emailTemplateRenderers[input.notificationType](input.payload);
      case NotificationType.RENTAL_CANCELLED:
        return await emailTemplateRenderers[input.notificationType](input.payload);
      case NotificationType.DOCUMENT_SIGNING_INVITATION:
        return await emailTemplateRenderers[input.notificationType](input.payload);
      case NotificationType.PASSWORD_RESET:
        return await emailTemplateRenderers[input.notificationType](input.payload);
    }
  }
}
