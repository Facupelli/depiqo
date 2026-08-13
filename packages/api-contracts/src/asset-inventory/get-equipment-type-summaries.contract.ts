import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetEquipmentTypeSummariesQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  branchId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const GetEquipmentTypeSummariesStockPerBranchSchema = z.object({
  branchId: z.string(),
  branchName: z.string().nullable(),
  quantity: z.number().int().nonnegative(),
});

export const GetEquipmentTypeSummariesItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  categoryId: z.string().nullable(),
  assetsQuantity: z.number().int().nonnegative(),
  usedAsAccessory: z.boolean(),
  rentableItem: z.boolean(),
  stockPerBranch: z.array(GetEquipmentTypeSummariesStockPerBranchSchema),
});

export const GetEquipmentTypeSummariesResponseSchema = z.object({
  data: z.array(GetEquipmentTypeSummariesItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type GetEquipmentTypeSummariesQueryDto = z.infer<typeof GetEquipmentTypeSummariesQuerySchema>;
export type GetEquipmentTypeSummariesStockPerBranchDto = z.infer<
  typeof GetEquipmentTypeSummariesStockPerBranchSchema
>;
export type GetEquipmentTypeSummariesItemDto = z.infer<typeof GetEquipmentTypeSummariesItemSchema>;
export type GetEquipmentTypeSummariesResponseDto = z.infer<typeof GetEquipmentTypeSummariesResponseSchema>;

export const getEquipmentTypeSummariesContract = {
  method: "GET",
  path: "/asset-inventory/equipment-types",
  query: GetEquipmentTypeSummariesQuerySchema,
  response: GetEquipmentTypeSummariesResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetEquipmentTypeSummariesQuerySchema,
  undefined,
  undefined,
  typeof GetEquipmentTypeSummariesResponseSchema
>;
