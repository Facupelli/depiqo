import { CreateConfirmedRentalBodySchema, ExplicitOffsetInstantSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export const CreateConfirmedRentalApplicationInputSchema = CreateConfirmedRentalBodySchema.transform((body) => ({
  ...body,
  period: {
    start: ExplicitOffsetInstantSchema.parse(body.period.start),
    end: ExplicitOffsetInstantSchema.parse(body.period.end),
  },
}));

export class CreateConfirmedRentalRequestDto extends createZodDto(CreateConfirmedRentalApplicationInputSchema) {}
