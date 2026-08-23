import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const CreatePackageRequirementBodySchema = z.object({
  equipmentTypeId: z.string().min(1),
  quantityPerItem: z.coerce.number().int().positive(),
});

export const CreatePackageBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().min(1).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  branchIds: z.array(z.string().min(1)).min(1),
  requirements: z.array(CreatePackageRequirementBodySchema).min(1),
});

export const CreatePackageResponseSchema = z.object({
  rentableItemId: z.string(),
  rentalOfferIds: z.array(z.string()),
});

export type CreatePackageBodyDto = z.infer<typeof CreatePackageBodySchema>;
export type CreatePackageResponseDto = z.infer<typeof CreatePackageResponseSchema>;

export const createPackageContract = {
  method: "POST",
  path: "/offering-setup/packages",
  body: CreatePackageBodySchema,
  response: CreatePackageResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof CreatePackageBodySchema, typeof CreatePackageResponseSchema>;
