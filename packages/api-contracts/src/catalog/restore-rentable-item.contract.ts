import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const RestoreRentableItemParamsSchema = z.object({
  rentableItemId: z.string().trim().min(1),
});

export const RestoreRentableItemResponseSchema = z.null();

export type RestoreRentableItemParamsDto = z.infer<typeof RestoreRentableItemParamsSchema>;
export type RestoreRentableItemResponseDto = z.infer<typeof RestoreRentableItemResponseSchema>;

export const restoreRentableItemContract = {
  method: "POST",
  path: "/catalog/rentable-items/:rentableItemId/restore",
  params: RestoreRentableItemParamsSchema,
  response: RestoreRentableItemResponseSchema,
} satisfies ApiContract<
  typeof RestoreRentableItemParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof RestoreRentableItemResponseSchema
>;
