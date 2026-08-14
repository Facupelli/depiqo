import * as React from 'react';

import { RentalCancelledEmailPayload, RenderedEmail } from '../../../application/ports/email-renderer.port';
import { EmailLayout } from '../react-email/components/email-layout';
import { renderReactEmail } from '../react-email/render-react-email';
import { RentalCancelledEmailContent } from './components/rental-cancelled-email-content';

export async function renderRentalCancelledEmailTemplate(payload: RentalCancelledEmailPayload): Promise<RenderedEmail> {
  return await renderReactEmail({
    subject: 'Tu rental-order fue cancelada',
    component: (
      <EmailLayout
        brandName={payload.tenantName}
        headerLabel="Información importante"
        previewText="Te informamos que tu rental-order ha sido cancelada."
      >
        <RentalCancelledEmailContent tenantName={payload.tenantName} recipientName={payload.recipientName} />
      </EmailLayout>
    ),
  });
}
