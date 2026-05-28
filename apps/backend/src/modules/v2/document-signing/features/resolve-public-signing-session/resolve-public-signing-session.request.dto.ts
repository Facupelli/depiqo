import { ResolvePublicSigningSessionQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ResolvePublicSigningSessionQueryDto extends createZodDto(ResolvePublicSigningSessionQuerySchema) {}
