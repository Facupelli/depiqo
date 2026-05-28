import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetRentalOfferAvailabilityRequirementSchema = z.object({
  equipmentTypeId: z.string().trim().min(1),
  quantityPerItem: z.number().int().positive(),
});

export const GetRentalOfferAvailabilityOfferSchema = z.object({
  rentalOfferId: z.string().trim().min(1),
  requirements: z.array(GetRentalOfferAvailabilityRequirementSchema),
});

export const GetRentalOfferAvailabilityRequestSchema = z.object({
  branchId: z.string().trim().min(1),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  rentalOffers: z.array(GetRentalOfferAvailabilityOfferSchema),
});

export const GetRentalOfferAvailabilityItemSchema = z.object({
  rentalOfferId: z.string(),
  availableCount: z.number().int().nonnegative(),
});

export const GetRentalOfferAvailabilityResponseSchema = z.object({
  data: z.array(GetRentalOfferAvailabilityItemSchema),
});

export type GetRentalOfferAvailabilityRequirementDto = z.infer<typeof GetRentalOfferAvailabilityRequirementSchema>;
export type GetRentalOfferAvailabilityOfferDto = z.infer<typeof GetRentalOfferAvailabilityOfferSchema>;
export type GetRentalOfferAvailabilityRequestDto = z.infer<typeof GetRentalOfferAvailabilityRequestSchema>;
export type GetRentalOfferAvailabilityItemDto = z.infer<typeof GetRentalOfferAvailabilityItemSchema>;
export type GetRentalOfferAvailabilityResponseDto = z.infer<typeof GetRentalOfferAvailabilityResponseSchema>;

export const getRentalOfferAvailabilityContract = {
  method: "POST",
  path: "/v2/rental-commitment/rental-offers/availability",
  body: GetRentalOfferAvailabilityRequestSchema,
  response: GetRentalOfferAvailabilityResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof GetRentalOfferAvailabilityRequestSchema,
  typeof GetRentalOfferAvailabilityResponseSchema
>;
