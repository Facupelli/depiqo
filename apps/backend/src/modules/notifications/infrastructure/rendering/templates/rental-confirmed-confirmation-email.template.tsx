import * as React from 'react';

import { RentalConfirmedConfirmationEmailPayload, RenderedEmail } from '../../../application/ports/email-renderer.port';
import { EmailLayout } from '../react-email/components/email-layout';
import { renderReactEmail } from '../react-email/render-react-email';
import { RentalConfirmedConfirmationEmailContent } from './components/rental-confirmed-confirmation-email-content';

export async function renderRentalConfirmedConfirmationEmailTemplate(
  payload: RentalConfirmedConfirmationEmailPayload,
): Promise<RenderedEmail> {
  return await renderReactEmail({
    subject: `Tu alquiler #${payload.rentalNumber} fue confirmado`,
    component: (
      <EmailLayout
        brandName={payload.tenantName}
        headerLabel="Confirmación de alquiler"
        previewText={`Tu alquiler #${payload.rentalNumber} fue confirmado.`}
      >
        <RentalConfirmedConfirmationEmailContent
          rentalNumber={payload.rentalNumber}
          status={payload.status}
          fulfillmentMethod={payload.fulfillmentMethod}
          pickupDate={payload.pickupDate}
          pickupTime={payload.pickupTime}
          returnDate={payload.returnDate}
          returnTime={payload.returnTime}
        />
      </EmailLayout>
    ),
  });
}
