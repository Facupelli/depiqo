import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { AssetStatusSchema } from "./asset.schemas";

export const GetEquipmentTypeAssetsParamsSchema = z.object({
  equipmentTypeId: z.string().trim().min(1),
});

export const GetEquipmentTypeAssetsQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional(),
  status: AssetStatusSchema.optional(),
  branchId: z.string().trim().min(1).optional(),
  ownerId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const GetEquipmentTypeAssetsItemSchema = z.object({
  id: z.string(),
  serialNumber: z.string().nullable(),
  notes: z.string().nullable(),
  status: AssetStatusSchema,
  branchId: z.string(),
  branchName: z.string().nullable(),
  ownerId: z.string().nullable(),
  ownerName: z.string().nullable(),
  updatedAt: z.string().datetime(),
});

export const GetEquipmentTypeAssetsResponseSchema = z.object({
  data: z.array(GetEquipmentTypeAssetsItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type GetEquipmentTypeAssetsParamsDto = z.infer<
  typeof GetEquipmentTypeAssetsParamsSchema
>;
export type GetEquipmentTypeAssetsQueryDto = z.infer<
  typeof GetEquipmentTypeAssetsQuerySchema
>;
export type GetEquipmentTypeAssetsItemDto = z.infer<
  typeof GetEquipmentTypeAssetsItemSchema
>;
export type GetEquipmentTypeAssetsResponseDto = z.infer<
  typeof GetEquipmentTypeAssetsResponseSchema
>;

export const getEquipmentTypeAssetsContract = {
  method: "GET",
  path: "/asset-inventory/equipment-types/:equipmentTypeId/assets",
  params: GetEquipmentTypeAssetsParamsSchema,
  query: GetEquipmentTypeAssetsQuerySchema,
  response: GetEquipmentTypeAssetsResponseSchema,
} satisfies ApiContract<
  typeof GetEquipmentTypeAssetsParamsSchema,
  typeof GetEquipmentTypeAssetsQuerySchema,
  undefined,
  undefined,
  typeof GetEquipmentTypeAssetsResponseSchema
>;
