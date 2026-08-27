import { PDFDocument } from 'pdf-lib';

const CUSTOMER_SIGNATURE_LEFT = 44;
const CUSTOMER_SIGNATURE_MAX_WIDTH = 192.766;
const CUSTOMER_SIGNATURE_MAX_HEIGHT = 36;
const CUSTOMER_SIGNATURE_UNDERLINE_Y = 74.58;
const CUSTOMER_SIGNATURE_GAP = 4;

export interface CreateSignedRentalRemitoArtifactInput {
  unsignedPdf: Buffer;
  signatureImageDataUrl: string;
}

export class RentalRemitoSignedArtifactService {
  async create(input: CreateSignedRentalRemitoArtifactInput): Promise<Buffer> {
    const document = await PDFDocument.load(input.unsignedPdf);
    const signature = await document.embedPng(extractPngBytes(input.signatureImageDataUrl));
    const scale = Math.min(
      CUSTOMER_SIGNATURE_MAX_WIDTH / signature.width,
      CUSTOMER_SIGNATURE_MAX_HEIGHT / signature.height,
      1,
    );
    const width = signature.width * scale;
    const height = signature.height * scale;
    const x = CUSTOMER_SIGNATURE_LEFT + (CUSTOMER_SIGNATURE_MAX_WIDTH - width) / 2;
    const y = CUSTOMER_SIGNATURE_UNDERLINE_Y + CUSTOMER_SIGNATURE_GAP;

    for (const page of document.getPages()) {
      page.drawImage(signature, { x, y, width, height });
    }

    return Buffer.from(await document.save());
  }
}

function extractPngBytes(dataUrl: string): Buffer {
  const [, encoded] = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/) ?? [];
  if (!encoded) throw new Error('Signature must be a PNG data URL.');

  return Buffer.from(encoded, 'base64');
}
