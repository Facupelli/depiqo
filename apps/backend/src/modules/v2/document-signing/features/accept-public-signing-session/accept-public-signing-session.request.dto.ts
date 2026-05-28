import { AcceptPublicSigningSessionBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class AcceptPublicSigningSessionBodyDto extends createZodDto(AcceptPublicSigningSessionBodySchema) {}
