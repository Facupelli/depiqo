import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const PublicSigningSessionResolveResponseSchema = z.object({
  requestId: z.string().uuid(),
});

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
  signer: z.object({
    name: z.string().min(1),
    email: z.string().email().nullable(),
    phone: z.string().nullable(),
  }),
  acceptance: z.object({
    textVersion: z.string().min(1),
    textSnapshot: z.string().min(1),
  }),
});

export class PublicSigningSessionResolveResponseDto extends createZodDto(PublicSigningSessionResolveResponseSchema) {}

export class PublicSigningSessionResponseDto extends createZodDto(PublicSigningSessionResponseSchema) {}
