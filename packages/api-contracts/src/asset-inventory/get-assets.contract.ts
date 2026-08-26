import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { AssetStatusSchema } from "./asset.schemas";

export const GetAssetsQuerySchema = z.object({
  ownerId: z.string().min(1).optional(),
});

export const AssetListItemSchema = z.object({
  id: z.string(),
  equipmentTypeId: z.string(),
  equipmentTypeName: z.string(),
  branchId: z.string(),
  branchName: z.string().nullable(),
  serialNumber: z.string().nullable(),
  status: AssetStatusSchema,
  ownerId: z.string().nullable(),
  ownerName: z.string().nullable(),
});

export const GetAssetsResponseSchema = z.array(AssetListItemSchema);

export type GetAssetsQueryDto = z.infer<typeof GetAssetsQuerySchema>;
export type AssetListItemDto = z.infer<typeof AssetListItemSchema>;
export type GetAssetsResponseDto = z.infer<typeof GetAssetsResponseSchema>;

export const getAssetsContract = {
  method: "GET",
  path: "/asset-inventory/assets",
  query: GetAssetsQuerySchema,
  response: GetAssetsResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetAssetsQuerySchema,
  undefined,
  undefined,
  typeof GetAssetsResponseSchema
>;
