import * as React from 'react';

import { RentalCreatedByCustomerEmailPayload, RenderedEmail } from '../../../application/ports/email-renderer.port';
import { EmailLayout } from '../react-email/components/email-layout';
import { renderReactEmail } from '../react-email/render-react-email';
import { RentalCreatedByCustomerEmailContent } from './components/rental-created-by-customer-email-content';

export async function renderRentalCreatedByCustomerEmailTemplate(
  payload: RentalCreatedByCustomerEmailPayload,
): Promise<RenderedEmail> {
  return await renderReactEmail({
    subject: `Nueva rental-order #${payload.rentalNumber} recibida`,
    component: (
      <EmailLayout
        headerLabel="Notificación del sistema"
        previewText={`Nueva rental-order #${payload.rentalNumber} creada por ${payload.customerEmail}.`}
      >
        <RentalCreatedByCustomerEmailContent
          rentalNumber={payload.rentalNumber}
          customerEmail={payload.customerEmail}
          status={payload.status}
          fulfillmentMethod={payload.fulfillmentMethod}
          pickupDate={payload.pickupDate}
          pickupTime={payload.pickupTime}
          returnDate={payload.returnDate}
          returnTime={payload.returnTime}
          locationName={payload.locationName}
          timezone={payload.timezone}
        />
      </EmailLayout>
    ),
  });
}
