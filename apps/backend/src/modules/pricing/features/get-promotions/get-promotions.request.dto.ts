import { GetPromotionsQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetPromotionsRequestDto extends createZodDto(GetPromotionsQuerySchema) {}
