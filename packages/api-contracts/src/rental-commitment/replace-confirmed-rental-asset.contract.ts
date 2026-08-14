import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const ReplaceConfirmedRentalAssetParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
});

export const ReplaceConfirmedRentalAssetBodySchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  currentAssignedAssetId: z.string().trim().min(1),
  replacementAssetId: z.string().trim().min(1),
});

export const ReplaceConfirmedRentalAssetResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type ReplaceConfirmedRentalAssetParamsDto = z.infer<typeof ReplaceConfirmedRentalAssetParamsSchema>;
export type ReplaceConfirmedRentalAssetBodyDto = z.infer<typeof ReplaceConfirmedRentalAssetBodySchema>;
export type ReplaceConfirmedRentalAssetResponseDto = z.infer<typeof ReplaceConfirmedRentalAssetResponseSchema>;

export const replaceConfirmedRentalAssetContract = {
  method: "POST",
  path: "/rental-commitments/confirmed-rentals/:rentalId/assigned-assets/replace",
  params: ReplaceConfirmedRentalAssetParamsSchema,
  body: ReplaceConfirmedRentalAssetBodySchema,
  response: ReplaceConfirmedRentalAssetResponseSchema,
} satisfies ApiContract<
  typeof ReplaceConfirmedRentalAssetParamsSchema,
  undefined,
  undefined,
  typeof ReplaceConfirmedRentalAssetBodySchema,
  typeof ReplaceConfirmedRentalAssetResponseSchema
>;
