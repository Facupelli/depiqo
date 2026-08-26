import { CreatePromotionResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreatePromotionResponseDto extends createZodDto(CreatePromotionResponseSchema) {}
