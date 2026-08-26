import { CreateDraftRentalBodySchema, ExplicitOffsetInstantSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export const CreateDraftRentalApplicationInputSchema = CreateDraftRentalBodySchema.transform((body) => ({
  ...body,
  period: {
    start: ExplicitOffsetInstantSchema.parse(body.period.start),
    end: ExplicitOffsetInstantSchema.parse(body.period.end),
  },
}));

export class CreateDraftRentalRequestDto extends createZodDto(CreateDraftRentalApplicationInputSchema) {}
