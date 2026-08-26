import * as React from 'react';

import { FulfillmentMethod, RentalStatus } from '../src/modules/rental-commitment/domain/rental-status';
import { EmailLayout } from '../src/modules/notifications/infrastructure/rendering/react-email/components/email-layout';
import { RentalConfirmedConfirmationEmailContent } from '../src/modules/notifications/infrastructure/rendering/templates/components/rental-confirmed-confirmation-email-content';

export default function RentalConfirmedConfirmationPreview() {
  return (
    <EmailLayout
      brandName="Alquileres Centro"
      headerLabel="Confirmación de alquiler"
      previewText="Tu alquiler #a1b2 fue confirmado."
    >
      <RentalConfirmedConfirmationEmailContent
        rentalNumber="a1b2"
        status={RentalStatus.Confirmed}
        fulfillmentMethod={FulfillmentMethod.Pickup}
        pickupDate="20/05/2025"
        pickupTime="09:00"
        returnDate="22/05/2025"
        returnTime="17:00"
      />
    </EmailLayout>
  );
}
