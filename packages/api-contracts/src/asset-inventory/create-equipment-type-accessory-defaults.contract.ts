import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const CreateEquipmentTypeAccessoryDefaultsParamsSchema = z.object({
  equipmentTypeId: z.string().uuid(),
});

export const CreateEquipmentTypeAccessoryDefaultBodyItemSchema = z.object({
  accessoryEquipmentTypeId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const CreateEquipmentTypeAccessoryDefaultsBodySchema = z.object({
  accessories: z.array(CreateEquipmentTypeAccessoryDefaultBodyItemSchema).min(1),
});

export const CreateEquipmentTypeAccessoryDefaultsResponseSchema = z.null();

export type CreateEquipmentTypeAccessoryDefaultsParamsDto = z.infer<
  typeof CreateEquipmentTypeAccessoryDefaultsParamsSchema
>;
export type CreateEquipmentTypeAccessoryDefaultsBodyDto = z.infer<
  typeof CreateEquipmentTypeAccessoryDefaultsBodySchema
>;
export type CreateEquipmentTypeAccessoryDefaultsResponseDto = z.infer<
  typeof CreateEquipmentTypeAccessoryDefaultsResponseSchema
>;

export const createEquipmentTypeAccessoryDefaultsContract = {
  method: "POST",
  path: "/v2/asset-inventory/equipment-types/:equipmentTypeId/accessory-defaults",
  params: CreateEquipmentTypeAccessoryDefaultsParamsSchema,
  body: CreateEquipmentTypeAccessoryDefaultsBodySchema,
  response: CreateEquipmentTypeAccessoryDefaultsResponseSchema,
} satisfies ApiContract<
  typeof CreateEquipmentTypeAccessoryDefaultsParamsSchema,
  undefined,
  undefined,
  typeof CreateEquipmentTypeAccessoryDefaultsBodySchema,
  typeof CreateEquipmentTypeAccessoryDefaultsResponseSchema
>;
