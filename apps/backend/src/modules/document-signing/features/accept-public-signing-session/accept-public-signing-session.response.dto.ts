import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AcceptPublicSigningSessionResponseSchema = z.object({
  requestId: z.string().uuid(),
  status: z.literal('SIGNED'),
  signedAt: z.date(),
});

export class AcceptPublicSigningSessionResponseDto extends createZodDto(AcceptPublicSigningSessionResponseSchema) {}
