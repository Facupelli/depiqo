import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const RemoveConfirmedPackageDemandLineParamsSchema = z.object({
  rentalId: z.string().trim().min(1),
  demandLineId: z.string().trim().min(1),
});

export const RemoveConfirmedPackageDemandLineBodySchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
});

export const RemoveConfirmedPackageDemandLineResponseSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type RemoveConfirmedPackageDemandLineParamsDto = z.infer<
  typeof RemoveConfirmedPackageDemandLineParamsSchema
>;
export type RemoveConfirmedPackageDemandLineBodyDto = z.infer<
  typeof RemoveConfirmedPackageDemandLineBodySchema
>;
export type RemoveConfirmedPackageDemandLineResponseDto = z.infer<
  typeof RemoveConfirmedPackageDemandLineResponseSchema
>;

export const removeConfirmedPackageDemandLineContract = {
  method: "DELETE",
  path: "/rental-commitments/confirmed-rentals/:rentalId/demand-lines/:demandLineId",
  params: RemoveConfirmedPackageDemandLineParamsSchema,
  body: RemoveConfirmedPackageDemandLineBodySchema,
  response: RemoveConfirmedPackageDemandLineResponseSchema,
} satisfies ApiContract<
  typeof RemoveConfirmedPackageDemandLineParamsSchema,
  undefined,
  undefined,
  typeof RemoveConfirmedPackageDemandLineBodySchema,
  typeof RemoveConfirmedPackageDemandLineResponseSchema
>;
