import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const PublicSigningSessionResolveResponseSchema = z.object({
  requestId: z.string().uuid(),
});

const PublicSigningDocumentSchema = z.object({
  documentNumber: z.string().min(1),
  displayFileName: z.string().min(1),
  contentType: z.string().min(1),
  byteSize: z.number().int().nonnegative(),
  sha256: z.string().min(1),
});

const PublicSigningPrefilledSignerSchema = z.object({
  fullName: z.string().nullable(),
  documentNumber: z.string().nullable(),
});

export const PublicSigningSessionResponseSchema = z.object({
  requestId: z.string().uuid(),
  documentType: z.string().min(1),
  status: z.string().min(1),
  expiresAt: z.date(),
  document: PublicSigningDocumentSchema,
  prefilledSigner: PublicSigningPrefilledSignerSchema,
});

export class PublicSigningSessionResolveResponseDto extends createZodDto(PublicSigningSessionResolveResponseSchema) {}

export class PublicSigningSessionResponseDto extends createZodDto(PublicSigningSessionResponseSchema) {}
