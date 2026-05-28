import { CreateCategoryResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateCategoryResponseDto extends createZodDto(CreateCategoryResponseSchema) {}
