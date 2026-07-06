import { CalculateDraftRentalPriceBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CalculateDraftRentalPriceRequestDto extends createZodDto(CalculateDraftRentalPriceBodySchema) {}
