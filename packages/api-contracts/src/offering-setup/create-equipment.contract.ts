import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { CreateEquipmentTypeAssetBodySchema } from "../asset-inventory";

export const CreateEquipmentDetailsBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().min(1).optional().nullable(),
  categoryId: z.string().optional().nullable(),
});

export const CreateEquipmentStandaloneRentalBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().min(1).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  branchIds: z.array(z.string().min(1)).min(1),
});

export const CreateEquipmentBodySchema = z.object({
  equipment: CreateEquipmentDetailsBodySchema,
  assets: z.array(CreateEquipmentTypeAssetBodySchema).optional().default([]),
  standaloneRental: CreateEquipmentStandaloneRentalBodySchema.optional(),
});

export const CreateEquipmentResponseSchema = z.object({
  equipmentTypeId: z.string(),
  assetIds: z.array(z.string()),
  standaloneRental: z
    .object({
      rentableItemId: z.string(),
      rentalOfferIds: z.array(z.string()),
    })
    .nullable(),
});

export type CreateEquipmentBodyDto = z.infer<typeof CreateEquipmentBodySchema>;
export type CreateEquipmentResponseDto = z.infer<typeof CreateEquipmentResponseSchema>;

export const createEquipmentContract = {
  method: "POST",
  path: "/offering-setup/equipment",
  body: CreateEquipmentBodySchema,
  response: CreateEquipmentResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof CreateEquipmentBodySchema, typeof CreateEquipmentResponseSchema>;
