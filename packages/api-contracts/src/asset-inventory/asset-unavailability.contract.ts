import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";

const path = "/asset-inventory/assets/:assetId/unavailability-periods";
const periodPath = `${path}/:periodId`;

export const AssetUnavailabilityListParamsSchema = z.object({
  assetId: z.string().trim().min(1),
});
export const AssetUnavailabilityPeriodParamsSchema =
  AssetUnavailabilityListParamsSchema.extend({ periodId: z.uuid() });
export const AssetUnavailabilityReasonSchema = z
  .string()
  .trim()
  .min(1)
  .max(500);

export const ScheduleAssetUnavailabilityBodySchema = z.object({
  startsAt: ExplicitOffsetInstantWireSchema.optional(),
  endsAt: ExplicitOffsetInstantWireSchema,
  reason: AssetUnavailabilityReasonSchema,
});
export const RescheduleAssetUnavailabilityBodySchema =
  ScheduleAssetUnavailabilityBodySchema.required();

export const AssetUnavailabilityPeriodSchema =
  RescheduleAssetUnavailabilityBodySchema.extend({
    id: z.uuid(),
    createdAt: ExplicitOffsetInstantWireSchema,
    cancelledAt: ExplicitOffsetInstantWireSchema.nullable(),
  });
export type AssetUnavailabilityPeriod = z.infer<
  typeof AssetUnavailabilityPeriodSchema
>;

export const ListAssetUnavailabilityResponseSchema = z.object({
  data: z.array(AssetUnavailabilityPeriodSchema),
});
export const ScheduleAssetUnavailabilityResponseSchema = z.object({
  data: z.object({ id: z.uuid() }),
});

export const listAssetUnavailabilityContract = {
  method: "GET",
  path,
  params: AssetUnavailabilityListParamsSchema,
  response: ListAssetUnavailabilityResponseSchema,
} satisfies ApiContract<
  typeof AssetUnavailabilityListParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof ListAssetUnavailabilityResponseSchema
>;

export const scheduleAssetUnavailabilityContract = {
  method: "POST",
  path,
  params: AssetUnavailabilityListParamsSchema,
  body: ScheduleAssetUnavailabilityBodySchema,
  response: ScheduleAssetUnavailabilityResponseSchema,
} satisfies ApiContract<
  typeof AssetUnavailabilityListParamsSchema,
  undefined,
  undefined,
  typeof ScheduleAssetUnavailabilityBodySchema,
  typeof ScheduleAssetUnavailabilityResponseSchema
>;

export const rescheduleAssetUnavailabilityContract = {
  method: "PATCH",
  path: periodPath,
  params: AssetUnavailabilityPeriodParamsSchema,
  body: RescheduleAssetUnavailabilityBodySchema,
  response: z.null(),
} satisfies ApiContract<
  typeof AssetUnavailabilityPeriodParamsSchema,
  undefined,
  undefined,
  typeof RescheduleAssetUnavailabilityBodySchema
>;

export const cancelAssetUnavailabilityContract = {
  method: "DELETE",
  path: periodPath,
  params: AssetUnavailabilityPeriodParamsSchema,
  response: z.null(),
} satisfies ApiContract<typeof AssetUnavailabilityPeriodParamsSchema>;
