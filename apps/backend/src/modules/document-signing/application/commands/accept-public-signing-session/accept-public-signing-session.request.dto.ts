import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SIGNATURE_IMAGE_DATA_URL_MAX_LENGTH = 350_000;
const pngDataUrlPattern = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;

export const AcceptPublicSigningSessionBodySchema = z.object({
  signatureImageDataUrl: z
    .string()
    .trim()
    .min(1)
    .max(SIGNATURE_IMAGE_DATA_URL_MAX_LENGTH)
    .regex(pngDataUrlPattern),
  acceptanceTextVersion: z.string().trim().min(1),
  accepted: z.boolean(),
});

export class AcceptPublicSigningSessionBodyDto extends createZodDto(AcceptPublicSigningSessionBodySchema) {}
