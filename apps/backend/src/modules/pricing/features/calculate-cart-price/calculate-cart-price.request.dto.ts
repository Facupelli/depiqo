import { CalculateCartPriceBodySchema, ExplicitOffsetInstantSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export const CalculateCartPriceApplicationInputSchema = CalculateCartPriceBodySchema.transform((body) => ({
  ...body,
  rentalPeriod: {
    start: ExplicitOffsetInstantSchema.parse(body.rentalPeriod.start),
    end: ExplicitOffsetInstantSchema.parse(body.rentalPeriod.end),
  },
}));

export class CalculateCartPriceRequestDto extends createZodDto(CalculateCartPriceApplicationInputSchema) {}
