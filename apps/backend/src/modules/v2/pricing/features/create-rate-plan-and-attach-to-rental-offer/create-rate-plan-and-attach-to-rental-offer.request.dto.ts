import { CreateRatePlanAndAttachToRentalOfferBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateRatePlanAndAttachToRentalOfferRequestDto extends createZodDto(
  CreateRatePlanAndAttachToRentalOfferBodySchema,
) {}
