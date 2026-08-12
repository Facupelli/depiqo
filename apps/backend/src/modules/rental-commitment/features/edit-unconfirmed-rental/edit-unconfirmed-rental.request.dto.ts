import {
  EditUnconfirmedRentalBodySchema,
  EditUnconfirmedRentalParamsSchema,
  ExplicitOffsetInstantSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class EditUnconfirmedRentalParamsDto extends createZodDto(EditUnconfirmedRentalParamsSchema) {}

export const EditUnconfirmedRentalApplicationInputSchema = EditUnconfirmedRentalBodySchema.transform((body) => ({
  ...body,
  period: {
    start: ExplicitOffsetInstantSchema.parse(body.period.start),
    end: ExplicitOffsetInstantSchema.parse(body.period.end),
  },
}));

export class EditUnconfirmedRentalRequestDto extends createZodDto(EditUnconfirmedRentalApplicationInputSchema) {}
