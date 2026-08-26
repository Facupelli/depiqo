import { UpdatePromotionBodySchema, UpdatePromotionParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdatePromotionParamsDto extends createZodDto(UpdatePromotionParamsSchema) {}

export class UpdatePromotionRequestDto extends createZodDto(UpdatePromotionBodySchema) {}
