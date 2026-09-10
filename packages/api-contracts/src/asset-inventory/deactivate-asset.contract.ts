import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const DeactivateAssetParamsSchema = z.object({ assetId: z.string().trim().min(1) });
export const DeactivateAssetResponseSchema = z.null();

export type DeactivateAssetParamsDto = z.infer<typeof DeactivateAssetParamsSchema>;
export type DeactivateAssetResponseDto = z.infer<typeof DeactivateAssetResponseSchema>;

export const deactivateAssetContract = {
  method: "POST",
  path: "/asset-inventory/assets/:assetId/deactivate",
  params: DeactivateAssetParamsSchema,
  response: DeactivateAssetResponseSchema,
} satisfies ApiContract<
  typeof DeactivateAssetParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof DeactivateAssetResponseSchema
>;
