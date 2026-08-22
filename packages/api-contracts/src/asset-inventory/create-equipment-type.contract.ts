import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const CreateEquipmentTypeAssetBodySchema = z.object({
  branchId: z.string().min(1),
  serialNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
});

export const CreateEquipmentTypeBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().min(1).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  assets: z.array(CreateEquipmentTypeAssetBodySchema).optional().default([]),
});

export const CreateEquipmentTypeResponseSchema = z.object({
  equipmentTypeId: z.string(),
  assetIds: z.array(z.string()),
});

export type CreateEquipmentTypeBodyDto = z.infer<
  typeof CreateEquipmentTypeBodySchema
>;
export type CreateEquipmentTypeResponseDto = z.infer<
  typeof CreateEquipmentTypeResponseSchema
>;

export const createEquipmentTypeContract = {
  method: "POST",
  path: "/asset-inventory/equipment-types",
  body: CreateEquipmentTypeBodySchema,
  response: CreateEquipmentTypeResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof CreateEquipmentTypeBodySchema,
  typeof CreateEquipmentTypeResponseSchema
>;
