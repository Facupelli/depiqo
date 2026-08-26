import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetReplacementAssetCandidatesParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
  currentAssignedAssetId: z.string().trim().min(1),
});

export const GetReplacementAssetCandidatesResponseSchema = z.object({
  items: z.array(
    z.object({
      assetId: z.string(),
      serialNumber: z.string().nullable(),
    }),
  ),
});

export type GetReplacementAssetCandidatesParamsDto = z.infer<
  typeof GetReplacementAssetCandidatesParamsSchema
>;
export type GetReplacementAssetCandidatesResponseDto = z.infer<
  typeof GetReplacementAssetCandidatesResponseSchema
>;

export const getReplacementAssetCandidatesContract = {
  method: "GET",
  path: "/rental-commitments/confirmed-rentals/:rentalId/assigned-assets/:currentAssignedAssetId/replacement-candidates",
  params: GetReplacementAssetCandidatesParamsSchema,
  response: GetReplacementAssetCandidatesResponseSchema,
} satisfies ApiContract<
  typeof GetReplacementAssetCandidatesParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetReplacementAssetCandidatesResponseSchema
>;
