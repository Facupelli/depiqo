import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { AssetStatusSchema } from "./asset.schemas";

export const GetAssetSummariesQuerySchema = z.object({
  ids: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.split(",").map((id) => id.trim()).filter(Boolean))
    .pipe(z.array(z.string().min(1)).min(1)),
});

export const AssetSummaryOwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const AssetSummarySchema = z.object({
  id: z.string(),
  equipmentTypeId: z.string(),
  branchId: z.string(),
  serialNumber: z.string().nullable(),
  status: AssetStatusSchema,
  owner: AssetSummaryOwnerSchema.nullable(),
});

export const GetAssetSummariesResponseSchema = z.array(AssetSummarySchema);

export type GetAssetSummariesQueryDto = z.infer<typeof GetAssetSummariesQuerySchema>;
export type AssetSummaryOwnerDto = z.infer<typeof AssetSummaryOwnerSchema>;
export type AssetSummaryDto = z.infer<typeof AssetSummarySchema>;
export type GetAssetSummariesResponseDto = z.infer<typeof GetAssetSummariesResponseSchema>;

export const getAssetSummariesContract = {
  method: "GET",
  path: "/asset-inventory/asset-summaries",
  query: GetAssetSummariesQuerySchema,
  response: GetAssetSummariesResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetAssetSummariesQuerySchema,
  undefined,
  undefined,
  typeof GetAssetSummariesResponseSchema
>;
