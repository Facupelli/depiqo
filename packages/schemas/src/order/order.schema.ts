import { FulfillmentMethod } from "@repo/types";
import { z } from "zod";
import {
  localDateSchema,
  minutesFromMidnightSchema,
} from "../shared/rental-temporal.schema";

const moneyAmountStringSchema = z
  .string()
  .trim()
  .regex(
    /^(0|[1-9]\d*)(\.\d{1,2})?$/,
    "Amount must be a valid positive decimal with up to 2 decimals",
  );

const createDraftOrderInitialPricingAdjustmentSchema = z.object({
  mode: z.literal("TARGET_TOTAL"),
  targetTotal: moneyAmountStringSchema,
});

export const productOrderItemSchema = z.object({
  type: z.literal("PRODUCT"),
  productTypeId: z.uuid(),
  assetId: z.uuid().optional(),
  quantity: z.number().default(1),
});

export const bundleOrderItemSchema = z.object({
  type: z.literal("BUNDLE"),
  bundleId: z.uuid(),
});

export const assignOrderItemAccessoryAssetsSchema = z.object({
  quantity: z.number().int().positive().optional(),
  assetIds: z.array(z.uuid()).optional(),
});

export const orderItemSchema = z.discriminatedUnion("type", [
  productOrderItemSchema,
  bundleOrderItemSchema,
]);

export const deliveryRequestSchema = z.object({
  recipientName: z.string().trim().min(1, "Recipient name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  addressLine1: z.string().trim().min(1, "Address line 1 is required"),
  addressLine2: z.string().trim().optional().nullable(),
  city: z.string().trim().min(1, "City is required"),
  stateRegion: z.string().trim().min(1, "State/region is required"),
  postalCode: z.string().trim().min(1, "Postal code is required"),
  country: z.string().trim().min(1, "Country is required"),
  instructions: z.string().trim().optional().nullable(),
});

export const createOrderSchemaBase = z.object({
  locationId: z.uuid(),
  pickupDate: localDateSchema,
  returnDate: localDateSchema,
  pickupTime: minutesFromMidnightSchema,
  returnTime: minutesFromMidnightSchema,
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  currency: z.string().min(1, "Currency is required"),
  insuranceSelected: z.boolean().default(false),
  couponCode: z.string().trim().min(1).optional(),
  fulfillmentMethod: z.enum(FulfillmentMethod),
  deliveryRequest: deliveryRequestSchema.optional().nullable(),
});

export const createOrderSchema = createOrderSchemaBase.superRefine(
  (value, ctx) => {
    if (
      value.fulfillmentMethod === FulfillmentMethod.DELIVERY &&
      !value.deliveryRequest
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Delivery request is required when fulfillment method is DELIVERY",
        path: ["deliveryRequest"],
      });
    }

    if (
      value.fulfillmentMethod === FulfillmentMethod.PICKUP &&
      value.deliveryRequest
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Delivery request must be omitted when fulfillment method is PICKUP",
        path: ["deliveryRequest"],
      });
    }
  },
);

export const createDraftOrderSchema = createOrderSchemaBase
  .extend({
    customerId: z.uuid().optional().nullable(),
    initialPricingAdjustment: createDraftOrderInitialPricingAdjustmentSchema
      .optional()
      .nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      value.fulfillmentMethod === FulfillmentMethod.DELIVERY &&
      !value.deliveryRequest
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Delivery request is required when fulfillment method is DELIVERY",
        path: ["deliveryRequest"],
      });
    }

    if (
      value.fulfillmentMethod === FulfillmentMethod.PICKUP &&
      value.deliveryRequest
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Delivery request must be omitted when fulfillment method is PICKUP",
        path: ["deliveryRequest"],
      });
    }
  });

export type ProductOrderItemDto = z.infer<typeof productOrderItemSchema>;
export type BundleOrderItemDto = z.infer<typeof bundleOrderItemSchema>;
export type OrderItemDto = z.infer<typeof orderItemSchema>;
export type AssignOrderItemAccessoryAssetsDto = z.infer<
  typeof assignOrderItemAccessoryAssetsSchema
>;
export type DeliveryRequestDto = z.infer<typeof deliveryRequestSchema>;
export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type CreateDraftOrderDto = z.infer<typeof createDraftOrderSchema>;
