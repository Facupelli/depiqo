import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const ReplaceEquipmentTypeAccessoryDefaultsParamsSchema = z.object({
  equipmentTypeId: z.string().uuid(),
});

export const ReplaceEquipmentTypeAccessoryDefaultBodyItemSchema = z.object({
  accessoryEquipmentTypeId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const ReplaceEquipmentTypeAccessoryDefaultsBodySchema = z.object({
  accessories: z.array(ReplaceEquipmentTypeAccessoryDefaultBodyItemSchema),
});

export const ReplaceEquipmentTypeAccessoryDefaultsResponseSchema = z.null();

export type ReplaceEquipmentTypeAccessoryDefaultsParamsDto = z.infer<
  typeof ReplaceEquipmentTypeAccessoryDefaultsParamsSchema
>;
export type ReplaceEquipmentTypeAccessoryDefaultsBodyDto = z.infer<
  typeof ReplaceEquipmentTypeAccessoryDefaultsBodySchema
>;
export type ReplaceEquipmentTypeAccessoryDefaultsResponseDto = z.infer<
  typeof ReplaceEquipmentTypeAccessoryDefaultsResponseSchema
>;

export const replaceEquipmentTypeAccessoryDefaultsContract = {
  method: "PUT",
  path: "/asset-inventory/equipment-types/:equipmentTypeId/accessory-defaults",
  params: ReplaceEquipmentTypeAccessoryDefaultsParamsSchema,
  body: ReplaceEquipmentTypeAccessoryDefaultsBodySchema,
  response: ReplaceEquipmentTypeAccessoryDefaultsResponseSchema,
} satisfies ApiContract<
  typeof ReplaceEquipmentTypeAccessoryDefaultsParamsSchema,
  undefined,
  undefined,
  typeof ReplaceEquipmentTypeAccessoryDefaultsBodySchema,
  typeof ReplaceEquipmentTypeAccessoryDefaultsResponseSchema
>;
