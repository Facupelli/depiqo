import { GetCurrentTenantResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetCurrentTenantResponseDto extends createZodDto(GetCurrentTenantResponseSchema) {}
