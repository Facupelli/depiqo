import { RegisterCustomDomainBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RegisterCustomDomainRequestDto extends createZodDto(RegisterCustomDomainBodySchema) {}
