import { UpdatePromotionResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdatePromotionResponseDto extends createZodDto(UpdatePromotionResponseSchema) {}
