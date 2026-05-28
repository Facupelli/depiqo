import { CalculateCartPriceBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CalculateCartPriceRequestDto extends createZodDto(CalculateCartPriceBodySchema) {}
