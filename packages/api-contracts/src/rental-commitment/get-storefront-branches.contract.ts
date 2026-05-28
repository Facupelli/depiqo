import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetStorefrontBranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  timezone: z.string(),
  supportsDelivery: z.boolean(),
  deliveryDefaults: z.object({
    country: z.string().nullable(),
    stateRegion: z.string().nullable(),
    city: z.string().nullable(),
    postalCode: z.string().nullable(),
  }),
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
