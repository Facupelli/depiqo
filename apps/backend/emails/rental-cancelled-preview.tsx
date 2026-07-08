import * as React from 'react';

import { EmailLayout } from '../src/modules/notifications/infrastructure/rendering/react-email/components/email-layout';
import { RentalCancelledEmailContent } from '../src/modules/notifications/infrastructure/rendering/templates/components/rental-cancelled-email-content';

export default function RentalCancelledPreview() {
  return (
    <EmailLayout
      brandName="Alquileres Centro"
      headerLabel="Información importante"
      previewText="Te informamos que tu rental-order ha sido cancelada."
    >
      <RentalCancelledEmailContent tenantName="Depiqo" recipientName="Facu" />
    </EmailLayout>
  );
}
