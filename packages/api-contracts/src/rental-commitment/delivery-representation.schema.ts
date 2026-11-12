import { z } from "zod";

export const RentalDeliveryDetailsSchema = z.object({
  address: z.string().trim().min(1),
  formattedAddress: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  providerPlaceId: z.string().optional(),
});

export const DeliveryResolvedDestinationSchema = z.object({
  formattedAddress: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  providerPlaceId: z.string().optional(),
});

export const DeliveryRestrictionSchema = z.enum([
  "NOT_CONFIGURED",
  "DISABLED",
  "BEYOND_MAX_DISTANCE",
  "DELIVERY_OUTSIDE_SERVICE_HOURS",
  "COLLECTION_OUTSIDE_SERVICE_HOURS",
]);

export const DeliveryStaffAgreementSchema = z.object({
  amount: z.string(),
  reason: z.string().optional(),
  agreedBy: z.string(),
  agreedAt: z.string().datetime(),
});

export const AcceptedDeliveryLegSchema = z.object({
  scheduledAt: z.string().datetime(),
  serviceLevel: z.enum(["NORMAL", "SPECIAL"]).optional(),
  basePrice: z.string().optional(),
  surcharge: z.string().optional(),
  total: z.string().optional(),
});

export const StaffArrangedDeliveryLegSchema = z.strictObject({
  scheduledAt: z.string().datetime(),
});

const common = {
  currency: z.string(),
  effectiveDeliveryCharge: z.string(),
  transportReservationMinutes: z.number().int().nonnegative(),
};

export const AcceptedDeliverySchema = z.discriminatedUnion("arrangement", [
  z.object({
    ...common,
    arrangement: z.literal("ROUTED"),
    distanceMeters: z.number().int().nonnegative(),
    delivery: AcceptedDeliveryLegSchema,
    collection: AcceptedDeliveryLegSchema,
    deliveryTotal: z.string().optional(),
    branchId: z.string().optional(),
    resolvedDestination: DeliveryResolvedDestinationSchema.optional(),
    policyException: z
      .object({
        overriddenRestrictions: z.array(DeliveryRestrictionSchema).min(1),
        reason: z.string().optional(),
        authorizedBy: z.string(),
        authorizedAt: z.string().datetime(),
      })
      .optional(),
    staffAgreement: DeliveryStaffAgreementSchema.optional(),
  }),
  z.strictObject({
    ...common,
    arrangement: z.literal("STAFF_ARRANGED"),
    delivery: StaffArrangedDeliveryLegSchema,
    collection: StaffArrangedDeliveryLegSchema,
    staffAgreement: DeliveryStaffAgreementSchema,
  }),
]);

export type AcceptedDeliveryDto = z.infer<typeof AcceptedDeliverySchema>;
export type RentalDeliveryDetailsDto = z.infer<
  typeof RentalDeliveryDetailsSchema
>;
