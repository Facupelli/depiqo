import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetEquipmentTypesQuerySchema = z.object({
  isActive: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    if (value === true || value === "true") {
      return true;
    }
    if (value === false || value === "false") {
      return false;
    }
    return value;
  }, z.boolean().optional()),
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export const GetEquipmentTypesItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  categoryId: z.string().nullable(),
});

export const GetEquipmentTypesResponseSchema = z.array(GetEquipmentTypesItemSchema);

export type GetEquipmentTypesQueryDto = z.infer<typeof GetEquipmentTypesQuerySchema>;
export type GetEquipmentTypesItemDto = z.infer<typeof GetEquipmentTypesItemSchema>;
export type GetEquipmentTypesResponseDto = z.infer<typeof GetEquipmentTypesResponseSchema>;

export const getEquipmentTypesContract = {
  method: "GET",
  path: "/asset-inventory/equipment-type-options",
  query: GetEquipmentTypesQuerySchema,
  response: GetEquipmentTypesResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetEquipmentTypesQuerySchema,
  undefined,
  undefined,
  typeof GetEquipmentTypesResponseSchema
>;
