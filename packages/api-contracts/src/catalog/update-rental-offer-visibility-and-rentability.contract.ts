import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const UpdateRentalOfferVisibilityAndRentabilityParamsSchema = z.object({
  rentalOfferId: z.string().trim().min(1),
});

export const UpdateRentalOfferVisibilityAndRentabilityBodySchema = z
  .object({
    isVisible: z.boolean().optional(),
    isRentable: z.boolean().optional(),
  })
  .refine((body) => body.isVisible !== undefined || body.isRentable !== undefined, {
    message: "At least one field must be provided.",
  });

export const UpdateRentalOfferVisibilityAndRentabilityResponseSchema = z.null();

export type UpdateRentalOfferVisibilityAndRentabilityParamsDto = z.infer<typeof UpdateRentalOfferVisibilityAndRentabilityParamsSchema>;
export type UpdateRentalOfferVisibilityAndRentabilityBodyDto = z.infer<typeof UpdateRentalOfferVisibilityAndRentabilityBodySchema>;
export type UpdateRentalOfferVisibilityAndRentabilityResponseDto = z.infer<typeof UpdateRentalOfferVisibilityAndRentabilityResponseSchema>;

export const updateRentalOfferVisibilityAndRentabilityContract = {
  method: "PATCH",
  path: "/catalog/rental-offers/:rentalOfferId",
  params: UpdateRentalOfferVisibilityAndRentabilityParamsSchema,
  body: UpdateRentalOfferVisibilityAndRentabilityBodySchema,
  response: UpdateRentalOfferVisibilityAndRentabilityResponseSchema,
} satisfies ApiContract<
  typeof UpdateRentalOfferVisibilityAndRentabilityParamsSchema,
  undefined,
  undefined,
  typeof UpdateRentalOfferVisibilityAndRentabilityBodySchema,
  typeof UpdateRentalOfferVisibilityAndRentabilityResponseSchema
>;
