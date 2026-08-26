import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const CreateRentableEquipmentAssetBodySchema = z.object({
  branchId: z.string().min(1),
  serialNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
});

export const CreateRentableEquipmentBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().min(1).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  kind: z.enum(["SINGLE", "PACKAGE", "KIT", "BUNDLE"]).default("SINGLE"),
  quantityPerItem: z.coerce.number().int().positive().default(1),
  assets: z.array(CreateRentableEquipmentAssetBodySchema).optional().default([]),
});

export const CreateRentableEquipmentResponseSchema = z.object({
  equipmentTypeId: z.string(),
  assetIds: z.array(z.string()),
  rentableItemId: z.string(),
  rentalOfferIds: z.array(z.string()),
});

export type CreateRentableEquipmentBodyDto = z.infer<typeof CreateRentableEquipmentBodySchema>;
export type CreateRentableEquipmentResponseDto = z.infer<typeof CreateRentableEquipmentResponseSchema>;

export const createRentableEquipmentContract = {
  method: "POST",
  path: "/offering-setup/rentable-equipment",
  body: CreateRentableEquipmentBodySchema,
  response: CreateRentableEquipmentResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof CreateRentableEquipmentBodySchema, typeof CreateRentableEquipmentResponseSchema>;
