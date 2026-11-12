import { ChangeConfirmedRentalDeliveryResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ChangeConfirmedRentalDeliveryResponseDto extends createZodDto(
  ChangeConfirmedRentalDeliveryResponseSchema,
) {}
