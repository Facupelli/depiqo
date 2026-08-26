import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const ChangeAssetOwnerParamsSchema = z.object({ assetId: z.string().trim().min(1) });
export const ChangeAssetOwnerBodySchema = z
  .object({
    ownerId: z.string().nullable(),
  })
  .strict();
export const ChangeAssetOwnerResponseSchema = z.null();

export type ChangeAssetOwnerParamsDto = z.infer<typeof ChangeAssetOwnerParamsSchema>;
export type ChangeAssetOwnerBodyDto = z.infer<typeof ChangeAssetOwnerBodySchema>;
export type ChangeAssetOwnerResponseDto = z.infer<typeof ChangeAssetOwnerResponseSchema>;

export const changeAssetOwnerContract = {
  method: "PATCH",
  path: "/asset-inventory/assets/:assetId/owner",
  params: ChangeAssetOwnerParamsSchema,
  body: ChangeAssetOwnerBodySchema,
  response: ChangeAssetOwnerResponseSchema,
} satisfies ApiContract<
  typeof ChangeAssetOwnerParamsSchema,
  undefined,
  undefined,
  typeof ChangeAssetOwnerBodySchema,
  typeof ChangeAssetOwnerResponseSchema
>;
