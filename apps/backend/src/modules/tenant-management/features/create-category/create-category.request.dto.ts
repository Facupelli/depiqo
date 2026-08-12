import { CreateCategoryBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateCategoryRequestDto extends createZodDto(CreateCategoryBodySchema) {}
