import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetStorefrontRentalOffersKindSchema = z.enum(["SINGLE", "PACKAGE", "KIT", "BUNDLE"]);

export const GetStorefrontRentalOffersQuerySchema = z.object({
  branchId: z.string().trim().min(1),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  kind: GetStorefrontRentalOffersKindSchema.optional(),
  categoryId: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});

export const GetStorefrontRentalOffersRequirementSchema = z.object({
  equipmentTypeId: z.string(),
  quantityPerItem: z.number().int().positive(),
});

export const GetStorefrontRentalOffersItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  description: z.string().nullable(),
  requirements: z.array(GetStorefrontRentalOffersRequirementSchema),
});

export const GetStorefrontRentalOffersResponseSchema = z.object({
  data: z.array(GetStorefrontRentalOffersItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type GetStorefrontRentalOffersKindDto = z.infer<typeof GetStorefrontRentalOffersKindSchema>;
export type GetStorefrontRentalOffersQueryDto = z.infer<typeof GetStorefrontRentalOffersQuerySchema>;
export type GetStorefrontRentalOffersRequirementDto = z.infer<typeof GetStorefrontRentalOffersRequirementSchema>;
export type GetStorefrontRentalOffersItemDto = z.infer<typeof GetStorefrontRentalOffersItemSchema>;
export type GetStorefrontRentalOffersResponseDto = z.infer<typeof GetStorefrontRentalOffersResponseSchema>;

export const getStorefrontRentalOffersContract = {
  method: "GET",
  path: "/storefront/catalog/rental-offers",
  query: GetStorefrontRentalOffersQuerySchema,
  response: GetStorefrontRentalOffersResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetStorefrontRentalOffersQuerySchema,
  undefined,
  undefined,
  typeof GetStorefrontRentalOffersResponseSchema
>;
