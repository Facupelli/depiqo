import { RegisterTenantWithOwnerBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RegisterTenantWithOwnerRequestDto extends createZodDto(RegisterTenantWithOwnerBodySchema) {}
