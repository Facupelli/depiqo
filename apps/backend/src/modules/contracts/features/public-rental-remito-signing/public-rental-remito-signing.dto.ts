import {
  AcceptPublicSigningSessionResponseSchema,
  StreamPublicSignedReceiptDocumentQuerySchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ResolvePublicSigningSessionQuerySchema = z.object({ token: z.string().min(1) });
export class ResolvePublicSigningSessionQueryDto extends createZodDto(ResolvePublicSigningSessionQuerySchema) {}

export const PublicSigningSessionResolveResponseSchema = z.object({ requestId: z.string().uuid() });
export class PublicSigningSessionResolveResponseDto extends createZodDto(PublicSigningSessionResolveResponseSchema) {}

export const PublicSigningSessionResponseSchema = z.object({
  requestId: z.string().uuid(),
  documentType: z.literal('RENTAL_AGREEMENT'),
  status: z.enum(['PENDING', 'SENT', 'VIEWED']),
  expiresAt: z.string().datetime(),
  signedAt: z.null(),
  document: z.object({
    documentNumber: z.string().min(1),
    displayFileName: z.string().min(1),
    contentType: z.string().min(1),
    byteSize: z.number().int().nonnegative(),
    sha256: z.string().min(1),
    hashAlgorithm: z.literal('SHA-256'),
  }),
  signer: z.object({ name: z.string().min(1), email: z.string().email().nullable(), phone: z.string().nullable() }),
  acceptance: z.object({ textVersion: z.string().min(1), textSnapshot: z.string().min(1) }),
});
export class PublicSigningSessionResponseDto extends createZodDto(PublicSigningSessionResponseSchema) {}

const SIGNATURE_IMAGE_DATA_URL_MAX_LENGTH = 350_000;
const pngDataUrlPattern = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
export const AcceptPublicSigningSessionBodySchema = z.object({
  signatureImageDataUrl: z.string().trim().min(1).max(SIGNATURE_IMAGE_DATA_URL_MAX_LENGTH).regex(pngDataUrlPattern),
  acceptanceTextVersion: z.string().trim().min(1),
  accepted: z.boolean(),
});
export class AcceptPublicSigningSessionBodyDto extends createZodDto(AcceptPublicSigningSessionBodySchema) {}
export class AcceptPublicSigningSessionResponseDto extends createZodDto(AcceptPublicSigningSessionResponseSchema) {}
export class StreamPublicSignedDocumentQueryDto extends createZodDto(StreamPublicSignedReceiptDocumentQuerySchema) {}
