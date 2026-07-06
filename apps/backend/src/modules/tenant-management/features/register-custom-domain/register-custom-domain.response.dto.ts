import { RegisterCustomDomainResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RegisterCustomDomainResponseDto extends createZodDto(RegisterCustomDomainResponseSchema) {}
