import { GetPromotionDetailParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetPromotionDetailParamsDto extends createZodDto(GetPromotionDetailParamsSchema) {}
