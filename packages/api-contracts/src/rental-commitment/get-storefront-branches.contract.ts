import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetStorefrontBranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  timezone: z.string(),
});

export const GetStorefrontBranchesResponseSchema = z.array(
  GetStorefrontBranchSchema,
);

export type GetStorefrontBranchDto = z.infer<typeof GetStorefrontBranchSchema>;
export type GetStorefrontBranchesResponseDto = z.infer<
  typeof GetStorefrontBranchesResponseSchema
>;

export const getStorefrontBranchesContract = {
  method: "GET",
  path: "/storefront/rental-commitment/branches",
  response: GetStorefrontBranchesResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  undefined,
  typeof GetStorefrontBranchesResponseSchema
>;
