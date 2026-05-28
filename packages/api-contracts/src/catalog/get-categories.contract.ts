import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});

export const GetCategoriesResponseSchema = z.array(CategorySchema);

export type CategoryDto = z.infer<typeof CategorySchema>;
export type GetCategoriesResponseDto = z.infer<typeof GetCategoriesResponseSchema>;

export const getCategoriesContract = {
  method: "GET",
  path: "/v2/catalog/categories",
  response: GetCategoriesResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof GetCategoriesResponseSchema>;
