import { CalculateDraftRentalPriceResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CalculateDraftRentalPriceResponseDto extends createZodDto(CalculateDraftRentalPriceResponseSchema) {}
