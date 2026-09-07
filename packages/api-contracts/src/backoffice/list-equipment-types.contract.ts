import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { PricingBillingUnitSchema } from "../pricing/billing-unit.schema";

export const ListEquipmentTypesQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
  branchId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const ListEquipmentTypesStartingPriceSchema = z.object({
  amount: z.string(),
  currency: z.string(),
  billingUnit: PricingBillingUnitSchema,
});

export const ListEquipmentTypesItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  category: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  activeUnitCount: z.number().int().nonnegative(),
  selectedBranchUnitCount: z.number().int().nonnegative().nullable(),
  rentalSummary: z.object({
    standaloneCount: z.number().int().nonnegative(),
    comboCount: z.number().int().nonnegative(),
    startingPrice: ListEquipmentTypesStartingPriceSchema.nullable(),
  }),
});

export const ListEquipmentTypesResponseSchema = z.object({
  data: z.array(ListEquipmentTypesItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type ListEquipmentTypesQueryDto = z.infer<typeof ListEquipmentTypesQuerySchema>;
export type ListEquipmentTypesStartingPriceDto = z.infer<typeof ListEquipmentTypesStartingPriceSchema>;
export type ListEquipmentTypesItemDto = z.infer<typeof ListEquipmentTypesItemSchema>;
export type ListEquipmentTypesResponseDto = z.infer<typeof ListEquipmentTypesResponseSchema>;

export const listEquipmentTypesContract = {
  method: "GET",
  path: "/backoffice/equipment-types",
  query: ListEquipmentTypesQuerySchema,
  response: ListEquipmentTypesResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof ListEquipmentTypesQuerySchema,
  undefined,
  undefined,
  typeof ListEquipmentTypesResponseSchema
>;
