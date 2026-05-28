import React from 'react';
import { DocumentProps, renderToBuffer } from '@react-pdf/renderer';

import { RentalRemitoPdfData } from '../../application/rental-remito/rental-remito-pdf-data';
import { RentalRemitoRendererPort } from '../../domain/ports/rental-remito-renderer.port';
import { createRentalRemitoDocument } from './components/rental-remito.document';

export class ReactPdfRentalRemitoRendererAdapter implements RentalRemitoRendererPort {
  async render(data: RentalRemitoPdfData): Promise<Buffer> {
    const element: React.ReactElement<DocumentProps> = createRentalRemitoDocument({ data });

    return renderToBuffer(element);
  }
}
