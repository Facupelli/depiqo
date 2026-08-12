import { ExplicitOffsetInstantSchema, GetRentalOfferAvailabilityRequestSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export const GetRentalOfferAvailabilityApplicationInputSchema = GetRentalOfferAvailabilityRequestSchema.transform(
  (body) => ({
    ...body,
    periodStart: ExplicitOffsetInstantSchema.parse(body.periodStart),
    periodEnd: ExplicitOffsetInstantSchema.parse(body.periodEnd),
  }),
);

export class GetRentalOfferAvailabilityRequestDto extends createZodDto(GetRentalOfferAvailabilityApplicationInputSchema) {}
