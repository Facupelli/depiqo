import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const ChangeEquipmentTypeLifecycleParamsSchema = z.object({ equipmentTypeId: z.string().trim().min(1) });
export const ChangeEquipmentTypeLifecycleResponseSchema = z.void();
export type ChangeEquipmentTypeLifecycleParamsDto = z.infer<typeof ChangeEquipmentTypeLifecycleParamsSchema>;

export const deactivateEquipmentTypeContract = {
  method: "POST",
  path: "/asset-inventory/equipment-types/:equipmentTypeId/deactivate",
  params: ChangeEquipmentTypeLifecycleParamsSchema,
  response: ChangeEquipmentTypeLifecycleResponseSchema,
} satisfies ApiContract<typeof ChangeEquipmentTypeLifecycleParamsSchema, undefined, undefined, undefined, typeof ChangeEquipmentTypeLifecycleResponseSchema>;

export const reactivateEquipmentTypeContract = {
  method: "POST",
  path: "/asset-inventory/equipment-types/:equipmentTypeId/reactivate",
  params: ChangeEquipmentTypeLifecycleParamsSchema,
  response: ChangeEquipmentTypeLifecycleResponseSchema,
} satisfies ApiContract<typeof ChangeEquipmentTypeLifecycleParamsSchema, undefined, undefined, undefined, typeof ChangeEquipmentTypeLifecycleResponseSchema>;
