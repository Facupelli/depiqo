import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { LocalDateSchema } from "../local-date.schema";

export const GetStorefrontRentalOfferAvailabilityRequirementSchema = z.object({
  equipmentTypeId: z.string().trim().min(1),
  quantityPerItem: z.number().int().positive(),
});

export const GetStorefrontRentalOfferAvailabilityOfferSchema = z.object({
  rentalOfferId: z.string().trim().min(1),
  requirements: z.array(GetStorefrontRentalOfferAvailabilityRequirementSchema),
});

export const GetStorefrontRentalOfferAvailabilityRequestSchema = z.object({
  branchId: z.string().trim().min(1),
  periodStart: LocalDateSchema,
  periodEnd: LocalDateSchema,
  rentalOffers: z.array(GetStorefrontRentalOfferAvailabilityOfferSchema),
});

export const GetStorefrontRentalOfferAvailabilityItemSchema = z.object({
  rentalOfferId: z.string(),
  availableCount: z.number().int().nonnegative(),
});

export const GetStorefrontRentalOfferAvailabilityResponseSchema = z.object({
  data: z.array(GetStorefrontRentalOfferAvailabilityItemSchema),
});

export type GetStorefrontRentalOfferAvailabilityRequirementDto = z.infer<
  typeof GetStorefrontRentalOfferAvailabilityRequirementSchema
>;
export type GetStorefrontRentalOfferAvailabilityOfferDto = z.infer<
  typeof GetStorefrontRentalOfferAvailabilityOfferSchema
>;
export type GetStorefrontRentalOfferAvailabilityRequestDto = z.input<
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
