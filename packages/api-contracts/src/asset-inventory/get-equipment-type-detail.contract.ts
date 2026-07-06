import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetEquipmentTypeDetailParamsSchema = z.object({
  equipmentTypeId: z.string().min(1),
});

export const GetEquipmentTypeDetailAccessoryDefaultSchema = z.object({
  id: z.string(),
  accessoryEquipmentTypeId: z.string(),
  accessoryEquipmentTypeName: z.string(),
  quantity: z.number().int().positive(),
});

export const GetEquipmentTypeDetailAssetSchema = z.object({
  id: z.string(),
  serialNumber: z.string().nullable(),
  branchId: z.string(),
  branchName: z.string().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "RETIRED"]),
  ownerId: z.string().nullable(),
  ownerName: z.string().nullable(),
  lastUpdate: z.string().datetime(),
});

export const GetEquipmentTypeDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  accessoryDefaults: z.array(GetEquipmentTypeDetailAccessoryDefaultSchema),
  assets: z.array(GetEquipmentTypeDetailAssetSchema),
});

export type GetEquipmentTypeDetailParamsDto = z.infer<typeof GetEquipmentTypeDetailParamsSchema>;
export type GetEquipmentTypeDetailAccessoryDefaultDto = z.infer<
  typeof GetEquipmentTypeDetailAccessoryDefaultSchema
>;
export type GetEquipmentTypeDetailAssetDto = z.infer<typeof GetEquipmentTypeDetailAssetSchema>;
export type GetEquipmentTypeDetailResponseDto = z.infer<typeof GetEquipmentTypeDetailResponseSchema>;

export const getEquipmentTypeDetailContract = {
  method: "GET",
  path: "/asset-inventory/equipment-types/:equipmentTypeId",
  params: GetEquipmentTypeDetailParamsSchema,
  response: GetEquipmentTypeDetailResponseSchema,
} satisfies ApiContract<
  typeof GetEquipmentTypeDetailParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetEquipmentTypeDetailResponseSchema
>;
