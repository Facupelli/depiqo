import { GetPublicSigningSessionResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetPublicSigningSessionResponseDto extends createZodDto(GetPublicSigningSessionResponseSchema) {}
