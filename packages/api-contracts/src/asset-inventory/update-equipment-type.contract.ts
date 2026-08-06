import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const UpdateEquipmentTypeParamsSchema = z.object({ equipmentTypeId: z.string().trim().min(1) });
export const UpdateEquipmentTypeBodySchema = z
  .object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.description !== undefined, {
    message: "At least one metadata field must be provided.",
  });
export const UpdateEquipmentTypeResponseSchema = z.void();

export type UpdateEquipmentTypeParamsDto = z.infer<typeof UpdateEquipmentTypeParamsSchema>;
export type UpdateEquipmentTypeBodyDto = z.infer<typeof UpdateEquipmentTypeBodySchema>;

export const updateEquipmentTypeContract = {
  method: "PATCH",
  path: "/asset-inventory/equipment-types/:equipmentTypeId",
  params: UpdateEquipmentTypeParamsSchema,
  body: UpdateEquipmentTypeBodySchema,
  response: UpdateEquipmentTypeResponseSchema,
} satisfies ApiContract<typeof UpdateEquipmentTypeParamsSchema, undefined, undefined, typeof UpdateEquipmentTypeBodySchema, typeof UpdateEquipmentTypeResponseSchema>;
