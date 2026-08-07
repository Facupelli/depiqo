import { AcceptPublicSigningSessionResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class AcceptPublicSigningSessionResponseDto extends createZodDto(AcceptPublicSigningSessionResponseSchema) {}
