import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const UpdateRentableItemDefinitionParamsSchema = z.object({
  rentableItemId: z.string().trim().min(1),
});

export const UpdateRentableItemDefinitionRequirementSchema = z.object({
  equipmentTypeId: z.string().trim().min(1),
  quantityPerItem: z.number().int().positive(),
});

export const UpdateRentableItemDefinitionBodySchema = z
  .object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    categoryId: z.string().trim().min(1).nullable().optional(),
    kind: z.enum(["SINGLE", "PACKAGE", "KIT", "BUNDLE"]).optional(),
    requirements: z.array(UpdateRentableItemDefinitionRequirementSchema).min(1).optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "At least one field must be provided.",
  });

export const UpdateRentableItemDefinitionResponseSchema = z.null();

export type UpdateRentableItemDefinitionParamsDto = z.infer<typeof UpdateRentableItemDefinitionParamsSchema>;
export type UpdateRentableItemDefinitionBodyDto = z.infer<typeof UpdateRentableItemDefinitionBodySchema>;
export type UpdateRentableItemDefinitionResponseDto = z.infer<typeof UpdateRentableItemDefinitionResponseSchema>;

export const updateRentableItemDefinitionContract = {
  method: "PATCH",
  path: "/catalog/rentable-items/:rentableItemId",
  params: UpdateRentableItemDefinitionParamsSchema,
  body: UpdateRentableItemDefinitionBodySchema,
  response: UpdateRentableItemDefinitionResponseSchema,
} satisfies ApiContract<
  typeof UpdateRentableItemDefinitionParamsSchema,
  undefined,
  undefined,
  typeof UpdateRentableItemDefinitionBodySchema,
  typeof UpdateRentableItemDefinitionResponseSchema
>;
