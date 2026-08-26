import { ExplicitOffsetInstantSchema, GetStorefrontRentalOffersQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

const GetStorefrontRentalOffersApplicationInputSchema = GetStorefrontRentalOffersQuerySchema.transform((query) => ({
  ...query,
  publishedAfter: query.publishedAfter ? ExplicitOffsetInstantSchema.parse(query.publishedAfter) : undefined,
}));

export class GetStorefrontRentalOffersRequestDto extends createZodDto(
  GetStorefrontRentalOffersApplicationInputSchema,
) {}
