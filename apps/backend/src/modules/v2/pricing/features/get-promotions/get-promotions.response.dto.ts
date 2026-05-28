import { GetPromotionsResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetPromotionsResponseDto extends createZodDto(GetPromotionsResponseSchema) {}
