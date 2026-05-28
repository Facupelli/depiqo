import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetOwnersItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const GetOwnersResponseSchema = z.array(GetOwnersItemSchema);

export type GetOwnersItemDto = z.infer<typeof GetOwnersItemSchema>;
export type GetOwnersResponseDto = z.infer<typeof GetOwnersResponseSchema>;

export const getOwnersContract = {
  method: "GET",
  path: "/v2/asset-inventory/owners",
  response: GetOwnersResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof GetOwnersResponseSchema>;
