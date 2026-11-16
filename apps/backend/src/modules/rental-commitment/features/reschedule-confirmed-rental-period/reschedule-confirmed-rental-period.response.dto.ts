import {
  PreviewConfirmedRentalPeriodResponseSchema,
  RescheduleConfirmedRentalPeriodResponseSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class PreviewConfirmedRentalPeriodResponseDto extends createZodDto(PreviewConfirmedRentalPeriodResponseSchema) {}

export class RescheduleConfirmedRentalPeriodResponseDto extends createZodDto(
  RescheduleConfirmedRentalPeriodResponseSchema,
) {}
