import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const SearchRentalOffersQuerySchema = z.object({
  branchId: z.string().trim().min(1),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(10).default(10),
});

export const SearchRentalOffersRequirementSchema = z.object({
  equipmentTypeId: z.string(),
  quantityPerItem: z.number().int().positive(),
});

export const SearchRentalOffersItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["SINGLE", "PACKAGE", "KIT", "BUNDLE"]),
  image: z.string().nullable(),
  description: z.string().nullable(),
  requirements: z.array(SearchRentalOffersRequirementSchema),
});

export const SearchRentalOffersResponseSchema = z.object({
  data: z.array(SearchRentalOffersItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type SearchRentalOffersQueryDto = z.infer<typeof SearchRentalOffersQuerySchema>;
export type SearchRentalOffersRequirementDto = z.infer<typeof SearchRentalOffersRequirementSchema>;
export type SearchRentalOffersItemDto = z.infer<typeof SearchRentalOffersItemSchema>;
export type SearchRentalOffersResponseDto = z.infer<typeof SearchRentalOffersResponseSchema>;

export const searchRentalOffersContract = {
  method: "GET",
  path: "/v2/catalog/rental-offers/search",
  query: SearchRentalOffersQuerySchema,
  response: SearchRentalOffersResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof SearchRentalOffersQuerySchema,
  undefined,
  undefined,
  typeof SearchRentalOffersResponseSchema
>;
