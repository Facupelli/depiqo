import { ExplicitOffsetInstantSchema, PreviewDraftRentalCostBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

const schema = PreviewDraftRentalCostBodySchema.transform((body) => ({
  ...body,
  period: {
    start: ExplicitOffsetInstantSchema.parse(body.period.start),
    end: ExplicitOffsetInstantSchema.parse(body.period.end),
  },
}));

export class PreviewDraftRentalCostRequestDto extends createZodDto(schema) {}
