import { PDFDocument } from 'pdf-lib';

const CUSTOMER_SIGNATURE_X = 44;
const CUSTOMER_SIGNATURE_WIDTH = 190;
const CUSTOMER_SIGNATURE_HEIGHT = 36;
const FIRST_AND_ANNEX_SIGNATURE_Y = 145;
const CONTINUATION_SIGNATURE_Y = 125;

export interface CreateSignedRentalRemitoArtifactInput {
  unsignedPdf: Buffer;
  signatureImageDataUrl: string;
}

export class RentalRemitoSignedArtifactService {
  async create(input: CreateSignedRentalRemitoArtifactInput): Promise<Buffer> {
    const document = await PDFDocument.load(input.unsignedPdf);
    const signature = await document.embedPng(extractPngBytes(input.signatureImageDataUrl));
    const pageCount = document.getPageCount();

    for (const [index, page] of document.getPages().entries()) {
      page.drawImage(signature, {
        x: CUSTOMER_SIGNATURE_X,
        y: isContinuationPage(index, pageCount) ? CONTINUATION_SIGNATURE_Y : FIRST_AND_ANNEX_SIGNATURE_Y,
        width: CUSTOMER_SIGNATURE_WIDTH,
        height: CUSTOMER_SIGNATURE_HEIGHT,
      });
    }

    return Buffer.from(await document.save());
  }
}

function isContinuationPage(pageIndex: number, pageCount: number): boolean {
  return pageIndex > 0 && pageIndex < pageCount - 1;
}

function extractPngBytes(dataUrl: string): Buffer {
  const [, encoded] = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/) ?? [];
  if (!encoded) throw new Error('Signature must be a PNG data URL.');

  return Buffer.from(encoded, 'base64');
}
