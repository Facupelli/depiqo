import { ResolvePublicSigningSessionResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ResolvePublicSigningSessionResponseDto extends createZodDto(ResolvePublicSigningSessionResponseSchema) {}
