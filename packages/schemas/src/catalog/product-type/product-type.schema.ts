import { z } from "zod";
import { RentalItemKind, TrackingMode } from "@repo/types";

export const productTypeAttributesSchema = z.record(z.string(), z.string());

export const productTypeIncludedItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  notes: z.string().nullable(),
});

export const createProductTypeSchema = z.object({
  categoryId: z.uuid().nullable(),
  billingUnitId: z.uuid(),
  name: z.string().min(1, "Name is required"),
  imageUrl: z.string(),
  description: z.string().nullable(),
  kind: z.enum(RentalItemKind).default(RentalItemKind.PRIMARY),
  trackingMode: z.enum(TrackingMode),
  excludeFromNewArrivals: z.boolean().default(false),
  attributes: productTypeAttributesSchema,
  includedItems: z.array(productTypeIncludedItemSchema),
});

export const updateProductTypeSchema = z.object({
  categoryId: z.uuid().nullable().optional(),
  billingUnitId: z.uuid().optional(),
  name: z.string().min(1, "Name is required").optional(),
  imageUrl: z.string().optional(),
  description: z.string().nullable().optional(),
  kind: z.enum(RentalItemKind).optional(),
  trackingMode: z.enum(TrackingMode).optional(),
  excludeFromNewArrivals: z.boolean().optional(),
  attributes: productTypeAttributesSchema.optional(),
  includedItems: z.array(productTypeIncludedItemSchema).optional(),
});

export type ProductTypeAttributesDto = z.infer<
  typeof productTypeAttributesSchema
>;
export type ProductTypeIncludedItemDto = z.infer<
  typeof productTypeIncludedItemSchema
>;
export type CreateProductTypeDto = z.infer<typeof createProductTypeSchema>;
export type UpdateProductTypeDto = z.infer<typeof updateProductTypeSchema>;
