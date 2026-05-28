import { GetStorefrontRentalOffersPricingResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetStorefrontRentalOffersPricingResponseDto extends createZodDto(
  GetStorefrontRentalOffersPricingResponseSchema,
) {}
