import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const CreateCategoryBodySchema = z.object({
  name: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const CreateCategoryResponseSchema = z.object({
  id: z.string(),
});

export type CreateCategoryBodyDto = z.infer<typeof CreateCategoryBodySchema>;
export type CreateCategoryResponseDto = z.infer<typeof CreateCategoryResponseSchema>;

export const createCategoryContract = {
  method: "POST",
  path: "/v2/catalog/categories",
  body: CreateCategoryBodySchema,
  response: CreateCategoryResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof CreateCategoryBodySchema, typeof CreateCategoryResponseSchema>;
