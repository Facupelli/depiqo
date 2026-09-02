import { ExplicitOffsetInstantSchema, ProspectiveCartCostBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

const CalculateProspectiveCartCostApplicationInputSchema = ProspectiveCartCostBodySchema.transform((body) => ({
  ...body,
  rentalPeriod: {
    start: ExplicitOffsetInstantSchema.parse(body.rentalPeriod.start),
    end: ExplicitOffsetInstantSchema.parse(body.rentalPeriod.end),
  },
}));

export class CalculateProspectiveCartCostRequestDto extends createZodDto(
  CalculateProspectiveCartCostApplicationInputSchema,
) {}
