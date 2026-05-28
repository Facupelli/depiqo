import { z } from "zod";

import type { ApiContract } from "../api-contract";

const BooleanQueryParamSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (value === true || value === "true") {
    return true;
  }
  if (value === false || value === "false") {
    return false;
  }
  return value;
}, z.boolean().optional());

export const GetRentableItemsKindSchema = z.enum(["SINGLE", "PACKAGE", "KIT", "BUNDLE"]);
export const GetRentableItemsStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);
export const GetRentableItemsBillingUnitSchema = z.enum(["HOUR", "DAY", "WEEK"]);

export const GetRentableItemsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  kind: GetRentableItemsKindSchema.optional(),
  status: GetRentableItemsStatusSchema.optional(),
  categoryId: z.string().trim().min(1).optional(),
  branchId: z.string().trim().min(1).optional(),
  isVisible: BooleanQueryParamSchema,
  isRentable: BooleanQueryParamSchema,
  hasActivePricing: BooleanQueryParamSchema,
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const GetRentableItemsOfferSchema = z.object({
  rentalOfferId: z.string(),
  branchId: z.string(),
  branchName: z.string().nullable(),
  isVisible: z.boolean(),
  isRentable: z.boolean(),
});

export const GetRentableItemsStartingPriceSchema = z.object({
  amount: z.string(),
  currency: z.string(),
  billingUnit: GetRentableItemsBillingUnitSchema,
});

export const GetRentableItemsRequiredEquipmentSchema = z.object({
  equipmentTypeId: z.string(),
  equipmentTypeName: z.string().nullable(),
  quantityPerItem: z.number().int().positive(),
});

export const GetRentableItemsItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: GetRentableItemsKindSchema,
  imageUrl: z.string().nullable(),
  categoryId: z.string().nullable(),
  status: GetRentableItemsStatusSchema,
  offers: z.array(GetRentableItemsOfferSchema),
  startingPrice: GetRentableItemsStartingPriceSchema.nullable(),
  requiredEquipment: z.array(GetRentableItemsRequiredEquipmentSchema),
});

export const GetRentableItemsResponseSchema = z.object({
  data: z.array(GetRentableItemsItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type GetRentableItemsQueryDto = z.infer<typeof GetRentableItemsQuerySchema>;
export type GetRentableItemsOfferDto = z.infer<typeof GetRentableItemsOfferSchema>;
export type GetRentableItemsStartingPriceDto = z.infer<typeof GetRentableItemsStartingPriceSchema>;
export type GetRentableItemsRequiredEquipmentDto = z.infer<typeof GetRentableItemsRequiredEquipmentSchema>;
export type GetRentableItemsItemDto = z.infer<typeof GetRentableItemsItemSchema>;
export type GetRentableItemsResponseDto = z.infer<typeof GetRentableItemsResponseSchema>;

export const getRentableItemsContract = {
  method: "GET",
  path: "/v2/catalog/rentable-items",
  query: GetRentableItemsQuerySchema,
  response: GetRentableItemsResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetRentableItemsQuerySchema,
  undefined,
  undefined,
  typeof GetRentableItemsResponseSchema
>;
