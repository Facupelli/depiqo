import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const RetireAssetParamsSchema = z.object({ assetId: z.string().trim().min(1) });
export const RetireAssetResponseSchema = z.null();

export type RetireAssetParamsDto = z.infer<typeof RetireAssetParamsSchema>;
export type RetireAssetResponseDto = z.infer<typeof RetireAssetResponseSchema>;

export const retireAssetContract = {
  method: "POST",
  path: "/asset-inventory/assets/:assetId/retire",
  params: RetireAssetParamsSchema,
  response: RetireAssetResponseSchema,
} satisfies ApiContract<
  typeof RetireAssetParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof RetireAssetResponseSchema
>;
