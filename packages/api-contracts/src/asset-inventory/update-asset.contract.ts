import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const UpdateAssetParamsSchema = z.object({ assetId: z.string().trim().min(1) });
export const UpdateAssetBodySchema = z
  .object({
    serialNumber: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((value) => value.serialNumber !== undefined || value.notes !== undefined, {
    message: "At least one metadata field must be provided.",
  });
export const UpdateAssetResponseSchema = z.void();

export type UpdateAssetParamsDto = z.infer<typeof UpdateAssetParamsSchema>;
export type UpdateAssetBodyDto = z.infer<typeof UpdateAssetBodySchema>;

export const updateAssetContract = {
  method: "PATCH",
  path: "/asset-inventory/assets/:assetId",
  params: UpdateAssetParamsSchema,
  body: UpdateAssetBodySchema,
  response: UpdateAssetResponseSchema,
} satisfies ApiContract<
  typeof UpdateAssetParamsSchema,
  undefined,
  undefined,
  typeof UpdateAssetBodySchema,
  typeof UpdateAssetResponseSchema
>;
