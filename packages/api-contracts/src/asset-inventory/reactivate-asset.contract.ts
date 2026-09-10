import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const ReactivateAssetParamsSchema = z.object({ assetId: z.string().trim().min(1) });
export const ReactivateAssetResponseSchema = z.null();

export type ReactivateAssetParamsDto = z.infer<typeof ReactivateAssetParamsSchema>;
export type ReactivateAssetResponseDto = z.infer<typeof ReactivateAssetResponseSchema>;

export const reactivateAssetContract = {
  method: "POST",
  path: "/asset-inventory/assets/:assetId/reactivate",
  params: ReactivateAssetParamsSchema,
  response: ReactivateAssetResponseSchema,
} satisfies ApiContract<
  typeof ReactivateAssetParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof ReactivateAssetResponseSchema
>;
