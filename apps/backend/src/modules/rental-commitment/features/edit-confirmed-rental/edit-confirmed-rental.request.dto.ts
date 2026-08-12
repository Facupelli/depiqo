import {
  EditConfirmedRentalBodySchema,
  EditConfirmedRentalParamsSchema,
  ExplicitOffsetInstantSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class EditConfirmedRentalParamsDto extends createZodDto(EditConfirmedRentalParamsSchema) {}

export const EditConfirmedRentalApplicationInputSchema = EditConfirmedRentalBodySchema.transform((body) => ({
  ...body,
  period: {
    start: ExplicitOffsetInstantSchema.parse(body.period.start),
    end: ExplicitOffsetInstantSchema.parse(body.period.end),
  },
}));

export class EditConfirmedRentalRequestDto extends createZodDto(EditConfirmedRentalApplicationInputSchema) {}
