import { UpdateTenantConfigBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateTenantConfigRequestDto extends createZodDto(UpdateTenantConfigBodySchema) {}
