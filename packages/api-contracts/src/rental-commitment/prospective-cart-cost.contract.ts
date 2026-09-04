import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";
import { CalculateCartPriceResponseSchema } from "../pricing/calculate-cart-price.contract";
import {
  CreateConfirmedRentalDeliveryDetailsSchema,
  CreateConfirmedRentalFulfillmentMethodSchema,
  CreateConfirmedRentalSelectedOfferSchema,
} from "./create-confirmed-rental.contract";

export const ProspectiveCartCostBodySchema = z.object({
  branchId: z.string().trim().min(1),
  rentalPeriod: z.object({
    start: ExplicitOffsetInstantWireSchema,
    end: ExplicitOffsetInstantWireSchema,
  }),
  selectedOffers: z.array(CreateConfirmedRentalSelectedOfferSchema).min(1),
  insuranceSelected: z.boolean().default(false),
  couponCode: z.string().trim().min(1).optional(),
  fulfillmentMethod: CreateConfirmedRentalFulfillmentMethodSchema,
  deliveryDetails: CreateConfirmedRentalDeliveryDetailsSchema.optional(),
});

export const ProspectiveCartCostDeliveryReasonSchema = z.enum([
  "NOT_CONFIGURED",
  "DISABLED",
  "BRANCH_UNAVAILABLE",
  "BRANCH_LOCATION_MISSING",
  "CUSTOMER_LOCATION_UNRESOLVED",
  "NO_ROUTE",
  "BEYOND_MAX_DISTANCE",
  "DELIVERY_OUTSIDE_SERVICE_HOURS",
  "COLLECTION_OUTSIDE_SERVICE_HOURS",
]);

export const ProspectiveCartCostResolvedLocationSchema = z.object({
  formattedAddress: z.string(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export const ProspectiveCartCostDeliveryLegSchema = z.object({
  scheduledAt: z.string().datetime(),
  serviceLevel: z.enum(["NORMAL", "SPECIAL"]),
  basePrice: z.string(),
  surcharge: z.string(),
  total: z.string(),
});

export const ProspectiveCartCostDeliverySchema = z.object({
  resolvedLocation: ProspectiveCartCostResolvedLocationSchema,
  distanceMeters: z.number().nonnegative(),
  currency: z.string(),
  delivery: ProspectiveCartCostDeliveryLegSchema,
  collection: ProspectiveCartCostDeliveryLegSchema,
  total: z.string(),
  transportReservationMinutes: z.number().int().nonnegative(),
});

export const ProspectiveCartCostResponseSchema = z.discriminatedUnion("available", [
  z.object({
    available: z.literal(true),
    pricing: CalculateCartPriceResponseSchema,
    delivery: ProspectiveCartCostDeliverySchema.nullable(),
    customerTotal: z.string(),
    currency: z.string(),
  }),
  z.object({
    available: z.literal(false),
    reason: ProspectiveCartCostDeliveryReasonSchema,
  }),
]);

export type ProspectiveCartCostBodyDto = z.input<typeof ProspectiveCartCostBodySchema>;
export type ProspectiveCartCostResponseDto = z.infer<typeof ProspectiveCartCostResponseSchema>;

export const prospectiveCartCostContract = {
  method: "POST",
  path: "/storefront/rental-commitment/cart/prospective-cost",
  body: ProspectiveCartCostBodySchema,
  response: ProspectiveCartCostResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof ProspectiveCartCostBodySchema,
  typeof ProspectiveCartCostResponseSchema
>;
