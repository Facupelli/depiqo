import { CreatePromotionBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreatePromotionRequestDto extends createZodDto(CreatePromotionBodySchema) {}
