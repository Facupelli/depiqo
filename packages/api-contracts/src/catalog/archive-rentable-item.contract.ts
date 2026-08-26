import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const ArchiveRentableItemParamsSchema = z.object({
  rentableItemId: z.string().trim().min(1),
});

export const ArchiveRentableItemResponseSchema = z.null();

export type ArchiveRentableItemParamsDto = z.infer<typeof ArchiveRentableItemParamsSchema>;
export type ArchiveRentableItemResponseDto = z.infer<typeof ArchiveRentableItemResponseSchema>;

export const archiveRentableItemContract = {
  method: "POST",
  path: "/catalog/rentable-items/:rentableItemId/archive",
  params: ArchiveRentableItemParamsSchema,
  response: ArchiveRentableItemResponseSchema,
} satisfies ApiContract<
  typeof ArchiveRentableItemParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof ArchiveRentableItemResponseSchema
>;
