import { UpdateTenantBrandingResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateTenantBrandingResponseDto extends createZodDto(UpdateTenantBrandingResponseSchema) {}
