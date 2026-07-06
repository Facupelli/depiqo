import { CreateRatePlanAndAttachToRentalOfferResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateRatePlanAndAttachToRentalOfferResponseDto extends createZodDto(
  CreateRatePlanAndAttachToRentalOfferResponseSchema,
) {}
