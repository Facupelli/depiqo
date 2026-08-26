import { ChangeRentalSelectionQuantityResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';
export class ChangeRentalSelectionQuantityResponseDto extends createZodDto(
  ChangeRentalSelectionQuantityResponseSchema,
) {}
