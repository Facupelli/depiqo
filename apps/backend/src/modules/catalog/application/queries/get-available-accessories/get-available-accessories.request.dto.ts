import { createZodDto } from 'nestjs-zod';
import { getAvailableAccessoriesQuerySchema } from '@repo/schemas';

export class GetAvailableAccessoriesRequestDto extends createZodDto(getAvailableAccessoriesQuerySchema) {}
