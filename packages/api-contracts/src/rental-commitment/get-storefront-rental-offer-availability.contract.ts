import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { LocalDateSchema } from "../local-date.schema";

export const GetStorefrontRentalOfferAvailabilityRequestSchema = z.object({
  branchId: z.string().trim().min(1),
  periodStart: LocalDateSchema,
  periodEnd: LocalDateSchema,
  rentalOfferIds: z
    .array(z.string().trim().min(1))
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "rentalOfferIds must not contain duplicates",
    }),
});

export const GetStorefrontRentalOfferAvailabilityItemSchema = z.object({
  rentalOfferId: z.string(),
  availableCount: z.number().int().nonnegative(),
});

export const GetStorefrontRentalOfferAvailabilityResponseSchema = z.object({
  data: z.array(GetStorefrontRentalOfferAvailabilityItemSchema),
});

export type GetStorefrontRentalOfferAvailabilityRequestDto = z.infer<
  typeof GetStorefrontRentalOfferAvailabilityRequestSchema
>;
export type GetStorefrontRentalOfferAvailabilityItemDto = z.infer<
  typeof GetStorefrontRentalOfferAvailabilityItemSchema
>;
export type GetStorefrontRentalOfferAvailabilityResponseDto = z.infer<
  typeof GetStorefrontRentalOfferAvailabilityResponseSchema
>;

export const getStorefrontRentalOfferAvailabilityContract = {
  method: "POST",
  path: "/storefront/rental-commitment/rental-offers/availability",
  body: GetStorefrontRentalOfferAvailabilityRequestSchema,
  response: GetStorefrontRentalOfferAvailabilityResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof GetStorefrontRentalOfferAvailabilityRequestSchema,
  typeof GetStorefrontRentalOfferAvailabilityResponseSchema
>;
