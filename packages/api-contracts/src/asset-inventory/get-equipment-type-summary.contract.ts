import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetEquipmentTypeSummaryParamsSchema = z.object({
  equipmentTypeId: z.string().min(1),
});

export const GetEquipmentTypeSummaryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  activeAssetCount: z.number().int().nonnegative(),
});

export type GetEquipmentTypeSummaryParamsDto = z.infer<
  typeof GetEquipmentTypeSummaryParamsSchema
>;
export type GetEquipmentTypeSummaryResponseDto = z.infer<
  typeof GetEquipmentTypeSummaryResponseSchema
>;

export const getEquipmentTypeSummaryContract = {
  method: "GET",
  path: "/asset-inventory/equipment-types/:equipmentTypeId/summary",
  params: GetEquipmentTypeSummaryParamsSchema,
  response: GetEquipmentTypeSummaryResponseSchema,
} satisfies ApiContract<
  typeof GetEquipmentTypeSummaryParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetEquipmentTypeSummaryResponseSchema
>;
