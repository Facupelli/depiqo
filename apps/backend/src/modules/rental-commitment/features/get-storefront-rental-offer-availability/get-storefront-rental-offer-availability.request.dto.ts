import { ExplicitOffsetInstantSchema, GetStorefrontRentalOfferAvailabilityRequestSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export const GetStorefrontRentalOfferAvailabilityApplicationInputSchema =
  GetStorefrontRentalOfferAvailabilityRequestSchema.transform((body) => ({
    ...body,
    periodStart: ExplicitOffsetInstantSchema.parse(body.periodStart),
    periodEnd: ExplicitOffsetInstantSchema.parse(body.periodEnd),
  }));

export class GetStorefrontRentalOfferAvailabilityRequestDto extends createZodDto(
  GetStorefrontRentalOfferAvailabilityApplicationInputSchema,
) {}
