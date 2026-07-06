import { RegisterTenantWithOwnerResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RegisterTenantWithOwnerResponseDto extends createZodDto(RegisterTenantWithOwnerResponseSchema) {}
