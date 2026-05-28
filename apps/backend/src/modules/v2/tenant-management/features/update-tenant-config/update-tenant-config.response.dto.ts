import { UpdateTenantConfigResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateTenantConfigResponseDto extends createZodDto(UpdateTenantConfigResponseSchema) {}
