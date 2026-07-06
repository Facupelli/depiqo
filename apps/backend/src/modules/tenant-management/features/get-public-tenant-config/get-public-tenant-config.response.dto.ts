import { GetPublicTenantConfigResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetPublicTenantConfigResponseDto extends createZodDto(GetPublicTenantConfigResponseSchema) {}
