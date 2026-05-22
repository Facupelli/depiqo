import { getOrderByIdParamSchema } from '@repo/schemas';
import { createZodDto } from 'nestjs-zod';

export class GetOrderAccessoryPreparationParamDto extends createZodDto(getOrderByIdParamSchema) {}
