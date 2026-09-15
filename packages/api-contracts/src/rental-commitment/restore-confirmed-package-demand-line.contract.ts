import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const RestoreConfirmedPackageDemandLineParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
  demandLineId: z.string().trim().min(1),
});

export const RestoreConfirmedPackageDemandLineBodySchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
});

export const RestoreConfirmedPackageDemandLineResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type RestoreConfirmedPackageDemandLineParamsDto = z.infer<
  typeof RestoreConfirmedPackageDemandLineParamsSchema
>;
export type RestoreConfirmedPackageDemandLineBodyDto = z.infer<
  typeof RestoreConfirmedPackageDemandLineBodySchema
>;
export type RestoreConfirmedPackageDemandLineResponseDto = z.infer<
  typeof RestoreConfirmedPackageDemandLineResponseSchema
>;

export const restoreConfirmedPackageDemandLineContract = {
  method: "POST",
  path: "/rental-commitments/confirmed-rentals/:rentalId/demand-lines/:demandLineId/restore",
  params: RestoreConfirmedPackageDemandLineParamsSchema,
  body: RestoreConfirmedPackageDemandLineBodySchema,
  response: RestoreConfirmedPackageDemandLineResponseSchema,
} satisfies ApiContract<
  typeof RestoreConfirmedPackageDemandLineParamsSchema,
  undefined,
  undefined,
  typeof RestoreConfirmedPackageDemandLineBodySchema,
  typeof RestoreConfirmedPackageDemandLineResponseSchema
>;
