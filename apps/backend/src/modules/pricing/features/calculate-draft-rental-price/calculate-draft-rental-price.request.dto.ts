import { CalculateDraftRentalPriceBodySchema, ExplicitOffsetInstantSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export const CalculateDraftRentalPriceApplicationInputSchema = CalculateDraftRentalPriceBodySchema.transform((body) => ({
  ...body,
  period: {
    start: ExplicitOffsetInstantSchema.parse(body.period.start),
    end: ExplicitOffsetInstantSchema.parse(body.period.end),
  },
}));

export class CalculateDraftRentalPriceRequestDto extends createZodDto(CalculateDraftRentalPriceApplicationInputSchema) {}
