import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetStorefrontCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const GetStorefrontCategoriesResponseSchema = z.array(
  GetStorefrontCategorySchema,
);

export type GetStorefrontCategoryDto = z.infer<
  typeof GetStorefrontCategorySchema
>;
export type GetStorefrontCategoriesResponseDto = z.infer<
  typeof GetStorefrontCategoriesResponseSchema
>;

export const getStorefrontCategoriesContract = {
  method: "GET",
  path: "/storefront/categories",
  response: GetStorefrontCategoriesResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  undefined,
  typeof GetStorefrontCategoriesResponseSchema
>;
