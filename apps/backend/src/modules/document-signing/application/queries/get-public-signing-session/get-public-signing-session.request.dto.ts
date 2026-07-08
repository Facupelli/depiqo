import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ResolvePublicSigningSessionQuerySchema = z.object({
  token: z.string().min(1),
});

export class ResolvePublicSigningSessionQueryDto extends createZodDto(ResolvePublicSigningSessionQuerySchema) {}
