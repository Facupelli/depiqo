import {
  ChangeRentalPeriodBodySchema,
  ChangeRentalPeriodParamsSchema,
  ExplicitOffsetInstantSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ChangeRentalPeriodParamsDto extends createZodDto(ChangeRentalPeriodParamsSchema) {}

export const ChangeRentalPeriodApplicationInputSchema = ChangeRentalPeriodBodySchema.transform((body) => ({
  ...body,
  start: ExplicitOffsetInstantSchema.parse(body.start),
  end: ExplicitOffsetInstantSchema.parse(body.end),
}));

export class ChangeRentalPeriodRequestDto extends createZodDto(ChangeRentalPeriodApplicationInputSchema) {}
