import { z } from "zod";
import { problemDetailsSchema } from "../api/api.schema";

export const unavailableOrderItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PRODUCT"),
    productTypeId: z.uuid(),
  }),
  z.object({
    type: z.literal("BUNDLE"),
    bundleId: z.uuid(),
  }),
]);

export const orderItemAvailabilityConflictGroupSchema = z.object({
  productTypeId: z.uuid(),
  availableCount: z.number().int().nonnegative(),
  requestedCount: z.number().int().positive(),
  affectedItems: z.array(unavailableOrderItemSchema),
});

export const orderItemAccessoryConflictSchema = z.object({
  orderItemAccessoryId: z.uuid(),
  accessoryRentalItemId: z.uuid(),
  requestedCount: z.number().int().positive(),
  availableCount: z.number().int().nonnegative(),
});

export const orderItemsUnavailableProblemSchema = problemDetailsSchema.extend({
  type: z.literal("errors://order-items-unavailable"),
  title: z.literal("Order Items Unavailable"),
  status: z.literal(409),
  unavailableItems: z.array(unavailableOrderItemSchema),
  conflictGroups: z.array(orderItemAvailabilityConflictGroupSchema),
  accessoryConflicts: z.array(orderItemAccessoryConflictSchema),
});

export type UnavailableOrderItemDto = z.infer<typeof unavailableOrderItemSchema>;
export type OrderItemAvailabilityConflictGroupDto = z.infer<
  typeof orderItemAvailabilityConflictGroupSchema
>;
export type OrderItemAccessoryConflictDto = z.infer<
  typeof orderItemAccessoryConflictSchema
>;
export type OrderItemsUnavailableProblemDto = z.infer<
  typeof orderItemsUnavailableProblemSchema
>;
