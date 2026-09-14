import {
  ExplicitOffsetInstantSchema,
  RescheduleConfirmedRentalPeriodBodySchema,
  RescheduleConfirmedRentalPeriodParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export const RescheduleConfirmedRentalPeriodApplicationInputSchema =
  RescheduleConfirmedRentalPeriodBodySchema.transform((body) => ({
    ...body,
    period: {
      start: ExplicitOffsetInstantSchema.parse(body.period.start),
      end: ExplicitOffsetInstantSchema.parse(body.period.end),
    },
  }));

export class RescheduleConfirmedRentalPeriodParamsDto extends createZodDto(
  RescheduleConfirmedRentalPeriodParamsSchema,
) {}
export class RescheduleConfirmedRentalPeriodRequestDto extends createZodDto(
  RescheduleConfirmedRentalPeriodApplicationInputSchema,
) {}
