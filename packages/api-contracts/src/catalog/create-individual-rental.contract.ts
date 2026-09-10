import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const CreateIndividualRentalBodySchema = z.object({
  equipmentTypeId: z.string().trim().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  categoryId: z.string().trim().min(1).nullable().optional(),
  branchIds: z.array(z.string()),
});

export const CreateIndividualRentalResponseSchema = z.object({
  rentableItemId: z.string(),
  rentalOfferIds: z.array(z.string()),
});

export type CreateIndividualRentalBodyDto = z.infer<typeof CreateIndividualRentalBodySchema>;
export type CreateIndividualRentalResponseDto = z.infer<typeof CreateIndividualRentalResponseSchema>;

export const createIndividualRentalContract = {
  method: "POST",
  path: "/catalog/rentable-items",
  body: CreateIndividualRentalBodySchema,
  response: CreateIndividualRentalResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof CreateIndividualRentalBodySchema,
  typeof CreateIndividualRentalResponseSchema
>;
