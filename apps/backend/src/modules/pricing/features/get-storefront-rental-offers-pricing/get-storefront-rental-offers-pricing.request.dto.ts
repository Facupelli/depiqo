import { GetStorefrontRentalOffersPricingQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetStorefrontRentalOffersPricingRequestDto extends createZodDto(
  GetStorefrontRentalOffersPricingQuerySchema,
) {}
