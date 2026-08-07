import * as React from 'react';

import { ConfirmedRentalEditedEmailPayload, RenderedEmail } from '../../../application/ports/email-renderer.port';
import { EmailLayout } from '../react-email/components/email-layout';
import { renderReactEmail } from '../react-email/render-react-email';
import { RentalConfirmedConfirmationEmailContent } from './components/rental-confirmed-confirmation-email-content';

export async function renderConfirmedRentalEditedEmailTemplate(
  payload: ConfirmedRentalEditedEmailPayload,
): Promise<RenderedEmail> {
  return await renderReactEmail({
    subject: `Tu alquiler #${payload.rentalNumber} fue modificado`,
    component: (
      <EmailLayout
        brandName={payload.tenantName}
        headerLabel="Modificación de alquiler"
        previewText={`Tu alquiler #${payload.rentalNumber} fue modificado.`}
      >
        <RentalConfirmedConfirmationEmailContent
          rentalNumber={payload.rentalNumber}
          status={payload.status}
          fulfillmentMethod={payload.fulfillmentMethod}
          pickupDate={payload.pickupDate}
          pickupTime={payload.pickupTime}
          returnDate={payload.returnDate}
          returnTime={payload.returnTime}
          introTitle="Tu alquiler fue modificado"
          introText="Actualizamos los datos de tu alquiler. Revisá a continuación los detalles vigentes."
        />
      </EmailLayout>
    ),
  });
}
