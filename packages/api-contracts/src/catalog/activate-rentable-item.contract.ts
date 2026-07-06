import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const ActivateRentableItemParamsSchema = z.object({
  rentableItemId: z.string().trim().min(1),
});

export const ActivateRentableItemResponseSchema = z.null();

export type ActivateRentableItemParamsDto = z.infer<typeof ActivateRentableItemParamsSchema>;
export type ActivateRentableItemResponseDto = z.infer<typeof ActivateRentableItemResponseSchema>;

export const activateRentableItemContract = {
  method: "POST",
  path: "/catalog/rentable-items/:rentableItemId/activate",
  params: ActivateRentableItemParamsSchema,
  response: ActivateRentableItemResponseSchema,
} satisfies ApiContract<
  typeof ActivateRentableItemParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof ActivateRentableItemResponseSchema
>;
