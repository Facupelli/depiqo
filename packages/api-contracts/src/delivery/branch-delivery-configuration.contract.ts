import { z } from "zod";

import type { ApiContract } from "../api-contract";

const MoneyStringSchema = z.string().regex(/^\d+(?:\.\d+)?$/, "Must be a non-negative decimal string");
const MinuteOfDaySchema = z.number().int().min(0).max(1439);

export const BranchDeliveryConfigurationParamsSchema = z.object({
  branchId: z.string().uuid(),
});

export const BranchDeliveryConfigurationSchema = z.object({
  enabled: z.boolean(),
  currency: z.string().regex(/^[A-Z]{3}$/, "Must be an uppercase three-letter currency code"),
  maximumDistanceMeters: z.number().int().positive(),
  eligibleWeekdays: z.array(z.number().int().min(0).max(6)).min(1),
  eligibilityStartMinute: MinuteOfDaySchema,
  eligibilityEndMinute: MinuteOfDaySchema,
  normalServiceStartMinute: MinuteOfDaySchema,
  normalServiceEndMinute: MinuteOfDaySchema,
  specialHoursSurcharge: MoneyStringSchema,
  transportReservationMinutes: z.number().int().nonnegative(),
  distancePriceBands: z
    .array(
      z.object({
        maxDistanceMeters: z.number().int().positive(),
        price: MoneyStringSchema,
      }),
    )
    .min(1),
});

export const GetBranchDeliveryConfigurationResponseSchema = BranchDeliveryConfigurationSchema.nullable();
export const PutBranchDeliveryConfigurationBodySchema = BranchDeliveryConfigurationSchema;
export const PutBranchDeliveryConfigurationResponseSchema = BranchDeliveryConfigurationSchema;

export type BranchDeliveryConfigurationDto = z.infer<typeof BranchDeliveryConfigurationSchema>;
export type GetBranchDeliveryConfigurationParamsDto = z.infer<typeof BranchDeliveryConfigurationParamsSchema>;
export type GetBranchDeliveryConfigurationResponseDto = z.infer<
  typeof GetBranchDeliveryConfigurationResponseSchema
>;
export type PutBranchDeliveryConfigurationParamsDto = GetBranchDeliveryConfigurationParamsDto;
export type PutBranchDeliveryConfigurationBodyDto = z.infer<typeof PutBranchDeliveryConfigurationBodySchema>;
export type PutBranchDeliveryConfigurationResponseDto = z.infer<
  typeof PutBranchDeliveryConfigurationResponseSchema
>;

export const getBranchDeliveryConfigurationContract = {
  method: "GET",
  path: "/delivery/branches/:branchId/configuration",
  params: BranchDeliveryConfigurationParamsSchema,
  response: GetBranchDeliveryConfigurationResponseSchema,
} satisfies ApiContract<
  typeof BranchDeliveryConfigurationParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetBranchDeliveryConfigurationResponseSchema
>;

export const putBranchDeliveryConfigurationContract = {
  method: "PUT",
  path: "/delivery/branches/:branchId/configuration",
  params: BranchDeliveryConfigurationParamsSchema,
  body: PutBranchDeliveryConfigurationBodySchema,
  response: PutBranchDeliveryConfigurationResponseSchema,
} satisfies ApiContract<
  typeof BranchDeliveryConfigurationParamsSchema,
  undefined,
  undefined,
  typeof PutBranchDeliveryConfigurationBodySchema,
  typeof PutBranchDeliveryConfigurationResponseSchema
>;
