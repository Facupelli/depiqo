import { UpdateTenantBrandingBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateTenantBrandingRequestDto extends createZodDto(UpdateTenantBrandingBodySchema) {}
