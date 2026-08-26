import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";

export const GetRentalOfferAvailabilityRequestSchema = z.object({
  branchId: z.string().trim().min(1),
  periodStart: ExplicitOffsetInstantWireSchema,
  periodEnd: ExplicitOffsetInstantWireSchema,
  rentalOfferIds: z
    .array(z.string().trim().min(1))
    .min(1)
    .superRefine((ids, context) => {
      const seen = new Set<string>();
      ids.forEach((id, index) => {
        if (seen.has(id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Rental offer IDs must be unique.",
            path: [index],
          });
        }
        seen.add(id);
      });
    }),
});

export const GetRentalOfferAvailabilityItemSchema = z.object({
  rentalOfferId: z.string(),
  availableCount: z.number().int().nonnegative(),
});

export const GetRentalOfferAvailabilityResponseSchema = z.array(
  GetRentalOfferAvailabilityItemSchema,
);

export type GetRentalOfferAvailabilityRequestDto = z.input<
  typeof GetRentalOfferAvailabilityRequestSchema
>;
export type GetRentalOfferAvailabilityItemDto = z.infer<
  typeof GetRentalOfferAvailabilityItemSchema
>;
export type GetRentalOfferAvailabilityResponseDto = z.infer<
  typeof GetRentalOfferAvailabilityResponseSchema
>;

export const getRentalOfferAvailabilityContract = {
  method: "POST",
  path: "/rental-commitment/rental-offers/availability",
  body: GetRentalOfferAvailabilityRequestSchema,
  response: GetRentalOfferAvailabilityResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof GetRentalOfferAvailabilityRequestSchema,
  typeof GetRentalOfferAvailabilityResponseSchema
>;
