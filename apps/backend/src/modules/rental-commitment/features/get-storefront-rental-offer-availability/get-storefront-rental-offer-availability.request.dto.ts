import { GetStorefrontRentalOfferAvailabilityRequestSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetStorefrontRentalOfferAvailabilityRequestDto extends createZodDto(
  GetStorefrontRentalOfferAvailabilityRequestSchema,
) {}
