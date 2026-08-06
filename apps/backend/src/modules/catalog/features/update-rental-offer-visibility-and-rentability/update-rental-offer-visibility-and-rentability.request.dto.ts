import {
  UpdateRentalOfferVisibilityAndRentabilityBodySchema,
  UpdateRentalOfferVisibilityAndRentabilityParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateRentalOfferVisibilityAndRentabilityParamsDto extends createZodDto(
  UpdateRentalOfferVisibilityAndRentabilityParamsSchema,
) {}
export class UpdateRentalOfferVisibilityAndRentabilityBodyDto extends createZodDto(
  UpdateRentalOfferVisibilityAndRentabilityBodySchema,
) {}
