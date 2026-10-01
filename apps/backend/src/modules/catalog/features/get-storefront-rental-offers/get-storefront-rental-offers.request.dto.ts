import { ExplicitOffsetInstantSchema, GetStorefrontRentalOffersQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

const GetStorefrontRentalOffersApplicationInputSchema = GetStorefrontRentalOffersQuerySchema.transform((query) => ({
  ...query,
  firstPublishedAfter: query.firstPublishedAfter ? ExplicitOffsetInstantSchema.parse(query.firstPublishedAfter) : undefined,
}));

export class GetStorefrontRentalOffersRequestDto extends createZodDto(
  GetStorefrontRentalOffersApplicationInputSchema,
) {}
