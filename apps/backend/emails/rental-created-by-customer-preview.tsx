import * as React from 'react';

import { FulfillmentMethod, RentalStatus } from '../src/modules/rental-commitment/domain/rental-status';
import { EmailLayout } from '../src/modules/notifications/infrastructure/rendering/react-email/components/email-layout';
import { RentalCreatedByCustomerEmailContent } from '../src/modules/notifications/infrastructure/rendering/templates/components/rental-created-by-customer-email-content';

export default function RentalCreatedByCustomerPreview() {
  return (
    <EmailLayout
      headerLabel="Notificación del sistema"
      previewText="Nueva rental-order #a1b2 creada por cliente@email.com."
    >
      <RentalCreatedByCustomerEmailContent
        rentalNumber="a1b2"
        customerEmail="cliente@email.com"
        status={RentalStatus.Pending}
        fulfillmentMethod={FulfillmentMethod.Pickup}
        pickupDate="20/05/2025"
        pickupTime="09:00"
        returnDate="22/05/2025"
        returnTime="17:00"
        locationName="Depósito Centro"
        timezone="America/Argentina/Buenos_Aires"
      />
    </EmailLayout>
  );
}
