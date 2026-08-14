import { CalculateCartPriceResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CalculateCartPriceResponseDto extends createZodDto(CalculateCartPriceResponseSchema) {}
