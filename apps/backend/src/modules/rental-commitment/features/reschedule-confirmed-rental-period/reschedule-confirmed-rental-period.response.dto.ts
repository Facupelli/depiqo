import { RescheduleConfirmedRentalPeriodResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RescheduleConfirmedRentalPeriodResponseDto extends createZodDto(
  RescheduleConfirmedRentalPeriodResponseSchema,
) {}
