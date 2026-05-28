import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const AddAssetsToEquipmentTypeParamsSchema = z.object({
  equipmentTypeId: z.string().min(1),
});

export const AddAssetsToEquipmentTypeAssetBodySchema = z.object({
  branchId: z.string().min(1),
  serialNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
});

export const AddAssetsToEquipmentTypeBodySchema = z.object({
  assets: z.array(AddAssetsToEquipmentTypeAssetBodySchema).min(1),
});

export const AddAssetsToEquipmentTypeResponseSchema = z.object({
  assetIds: z.array(z.string()),
});

export type AddAssetsToEquipmentTypeParamsDto = z.infer<typeof AddAssetsToEquipmentTypeParamsSchema>;
export type AddAssetsToEquipmentTypeBodyDto = z.infer<typeof AddAssetsToEquipmentTypeBodySchema>;
export type AddAssetsToEquipmentTypeResponseDto = z.infer<typeof AddAssetsToEquipmentTypeResponseSchema>;

export const addAssetsToEquipmentTypeContract = {
  method: "POST",
  path: "/v2/asset-inventory/equipment-types/:equipmentTypeId/assets",
  params: AddAssetsToEquipmentTypeParamsSchema,
  body: AddAssetsToEquipmentTypeBodySchema,
  response: AddAssetsToEquipmentTypeResponseSchema,
} satisfies ApiContract<
  typeof AddAssetsToEquipmentTypeParamsSchema,
  undefined,
  undefined,
  typeof AddAssetsToEquipmentTypeBodySchema,
  typeof AddAssetsToEquipmentTypeResponseSchema
>;
