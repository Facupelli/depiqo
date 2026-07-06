import { GetPromotionDetailResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetPromotionDetailResponseDto extends createZodDto(GetPromotionDetailResponseSchema) {}
