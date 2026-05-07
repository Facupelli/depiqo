import { z } from "zod";

export const accessoryPreparationAssetSchema = z.object({
  id: z.uuid(),
  serialNumber: z.string().nullable(),
  ownerId: z.uuid().nullable(),
  ownerName: z.string().nullable(),
});

export const accessoryPreparationSelectedLineSchema = z.object({
  id: z.uuid(),
  quantity: z.number().int(),
  notes: z.string().nullable(),
  assignedAssets: z.array(accessoryPreparationAssetSchema),
});

export const compatibleAccessorySchema = z.object({
  accessoryRentalItemId: z.uuid(),
  name: z.string(),
  isDefaultIncluded: z.boolean(),
  defaultQuantity: z.number().int(),
  defaultNotes: z.string().nullable(),
  selectedLine: accessoryPreparationSelectedLineSchema.nullable(),
  suggestedQuantity: z.number().int().nullable(),
  suggestedNotes: z.string().nullable(),
  availableCount: z.number().int(),
});

export const accessoryPreparationItemSchema = z.object({
  orderItemId: z.uuid(),
  productTypeId: z.uuid(),
  productTypeName: z.string(),
  assignedPrimaryAssets: z.array(accessoryPreparationAssetSchema),
  compatibleAccessories: z.array(compatibleAccessorySchema),
});

export const orderAccessoryPreparationResponseSchema = z.object({
  orderId: z.uuid(),
  locationId: z.uuid(),
  periodStart: z.iso.datetime(),
  periodEnd: z.iso.datetime(),
  items: z.array(accessoryPreparationItemSchema),
});

export const saveOrderAccessoryPreparationAccessorySchema = z.object({
  accessoryRentalItemId: z.uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().nullable().optional(),
  assetIds: z.array(z.uuid()).optional(),
  autoAssignQuantity: z.number().int().nonnegative().optional(),
});

export const saveOrderAccessoryPreparationSchema = z.object({
  items: z.array(
    z.object({
      orderItemId: z.uuid(),
      accessories: z.array(saveOrderAccessoryPreparationAccessorySchema),
    }),
  ),
});

export type AccessoryPreparationAsset = z.infer<
  typeof accessoryPreparationAssetSchema
>;
export type AccessoryPreparationSelectedLine = z.infer<
  typeof accessoryPreparationSelectedLineSchema
>;
export type CompatibleAccessory = z.infer<typeof compatibleAccessorySchema>;
export type AccessoryPreparationItem = z.infer<
  typeof accessoryPreparationItemSchema
>;
export type OrderAccessoryPreparationResponseDto = z.infer<
  typeof orderAccessoryPreparationResponseSchema
>;
export type SaveOrderAccessoryPreparationDto = z.infer<
  typeof saveOrderAccessoryPreparationSchema
>;
