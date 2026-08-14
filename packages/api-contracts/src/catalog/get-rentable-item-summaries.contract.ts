import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { GetRentableItemsKindSchema, GetRentableItemsStatusSchema } from "./get-rentable-items.contract";

export const GetRentableItemSummariesQuerySchema = z.object({
  ids: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.split(",").map((id) => id.trim()).filter(Boolean))
    .pipe(z.array(z.string().min(1)).min(1)),
});

export const RentableItemSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: GetRentableItemsKindSchema,
  imageUrl: z.string().nullable(),
  status: GetRentableItemsStatusSchema,
});

export const GetRentableItemSummariesResponseSchema = z.array(RentableItemSummarySchema);

export type GetRentableItemSummariesQueryDto = z.infer<typeof GetRentableItemSummariesQuerySchema>;
export type RentableItemSummaryDto = z.infer<typeof RentableItemSummarySchema>;
export type GetRentableItemSummariesResponseDto = z.infer<typeof GetRentableItemSummariesResponseSchema>;

export const getRentableItemSummariesContract = {
  method: "GET",
  path: "/catalog/rentable-item-summaries",
  query: GetRentableItemSummariesQuerySchema,
  response: GetRentableItemSummariesResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetRentableItemSummariesQuerySchema,
  undefined,
  undefined,
  typeof GetRentableItemSummariesResponseSchema
>;
