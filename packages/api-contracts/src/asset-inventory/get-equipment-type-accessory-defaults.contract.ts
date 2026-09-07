import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetEquipmentTypeAccessoryDefaultsParamsSchema = z.object({
  equipmentTypeId: z.string().trim().min(1),
});

export const GetEquipmentTypeAccessoryDefaultsItemSchema = z.object({
  accessoryEquipmentTypeId: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  defaultQuantity: z.number().int().positive(),
});

export const GetEquipmentTypeAccessoryDefaultsResponseSchema = z.array(
  GetEquipmentTypeAccessoryDefaultsItemSchema,
);

export type GetEquipmentTypeAccessoryDefaultsParamsDto = z.infer<
  typeof GetEquipmentTypeAccessoryDefaultsParamsSchema
>;
export type GetEquipmentTypeAccessoryDefaultsItemDto = z.infer<
  typeof GetEquipmentTypeAccessoryDefaultsItemSchema
>;
export type GetEquipmentTypeAccessoryDefaultsResponseDto = z.infer<
  typeof GetEquipmentTypeAccessoryDefaultsResponseSchema
>;

export const getEquipmentTypeAccessoryDefaultsContract = {
  method: "GET",
  path: "/asset-inventory/equipment-types/:equipmentTypeId/accessory-defaults",
  params: GetEquipmentTypeAccessoryDefaultsParamsSchema,
  response: GetEquipmentTypeAccessoryDefaultsResponseSchema,
} satisfies ApiContract<
  typeof GetEquipmentTypeAccessoryDefaultsParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetEquipmentTypeAccessoryDefaultsResponseSchema
>;
