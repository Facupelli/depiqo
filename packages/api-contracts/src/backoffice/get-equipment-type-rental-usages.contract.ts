import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { PricingBillingUnitSchema } from "../pricing/billing-unit.schema";

export const GetEquipmentTypeRentalUsagesParamsSchema = z.object({
  equipmentTypeId: z.string().trim().min(1),
});

export const EquipmentTypeRentalUsageStartingPriceSchema = z.object({
  amount: z.string(),
  currency: z.string(),
  billingUnit: PricingBillingUnitSchema,
});

export const EquipmentTypeRentalUsageOfferSchema = z.object({
  rentalOfferId: z.string(),
  branchId: z.string(),
  branchName: z.string().nullable(),
  isVisible: z.boolean(),
  isRentable: z.boolean(),
  pricing: z.object({
    configured: z.boolean(),
    startingPrice: EquipmentTypeRentalUsageStartingPriceSchema.nullable(),
  }),
});

const EquipmentTypeRentalUsageBaseSchema = z.object({
  rentableItemId: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  requirementQuantity: z.number().int().positive(),
});

export const IndividualRentalUsageSchema =
  EquipmentTypeRentalUsageBaseSchema.extend({
    kind: z.literal("SINGLE"),
    startingPrice: EquipmentTypeRentalUsageStartingPriceSchema.nullable(),
    offers: z.array(EquipmentTypeRentalUsageOfferSchema),
  });

export const ComboRentalUsageSchema = EquipmentTypeRentalUsageBaseSchema.extend(
  {
    kind: z.enum(["PACKAGE", "KIT", "BUNDLE"]),
  },
);

export const GetEquipmentTypeRentalUsagesResponseSchema = z.object({
  equipmentTypeId: z.string(),
  individuals: z.array(IndividualRentalUsageSchema),
  combos: z.array(ComboRentalUsageSchema),
});

export type GetEquipmentTypeRentalUsagesParamsDto = z.infer<
  typeof GetEquipmentTypeRentalUsagesParamsSchema
>;
export type EquipmentTypeRentalUsageStartingPriceDto = z.infer<
  typeof EquipmentTypeRentalUsageStartingPriceSchema
>;
export type EquipmentTypeRentalUsageOfferDto = z.infer<
  typeof EquipmentTypeRentalUsageOfferSchema
>;
export type IndividualRentalUsageDto = z.infer<
  typeof IndividualRentalUsageSchema
>;
export type ComboRentalUsageDto = z.infer<typeof ComboRentalUsageSchema>;
export type GetEquipmentTypeRentalUsagesResponseDto = z.infer<
  typeof GetEquipmentTypeRentalUsagesResponseSchema
>;

export const getEquipmentTypeRentalUsagesContract = {
  method: "GET",
  path: "/backoffice/equipment-types/:equipmentTypeId/rental-usages",
  params: GetEquipmentTypeRentalUsagesParamsSchema,
  response: GetEquipmentTypeRentalUsagesResponseSchema,
} satisfies ApiContract<
  typeof GetEquipmentTypeRentalUsagesParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetEquipmentTypeRentalUsagesResponseSchema
>;
