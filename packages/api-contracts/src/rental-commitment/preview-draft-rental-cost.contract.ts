import { z } from "zod";

import type { ApiContract } from "../api-contract";
import {
  CalculateDraftRentalPriceBodySchema,
  CalculateDraftRentalPriceResponseSchema,
} from "../pricing/calculate-draft-rental-price.contract";
import {
  AcceptedDeliveryLegSchema,
  DeliveryRestrictionSchema,
  DeliveryResolvedDestinationSchema,
  DeliveryStaffAgreementSchema,
  RentalDeliveryDetailsSchema,
  StaffArrangedDeliveryLegSchema,
} from "./delivery-representation.schema";
import { UpdateDraftRentalDeliveryDecisionsSchema } from "./draft-rental-delivery-decisions.schema";
import { UpdateDraftRentalDeliveryIntentSchema } from "./update-draft-rental.contract";

export const PreviewDraftRentalCostBodySchema =
  CalculateDraftRentalPriceBodySchema.extend({
    rentalId: z.string().trim().min(1).optional(),
    insuranceSelected: z.boolean().default(false),
    fulfillmentMethod: z.enum(["PICKUP", "DELIVERY"]),
    deliveryIntent: z
      .union([
        UpdateDraftRentalDeliveryIntentSchema,
        z.strictObject({
          type: z.literal("INCOMPLETE"),
          arrangement: z.enum(["ROUTED", "STAFF_ARRANGED"]),
        }),
      ])
      .optional(),
    deliveryDecisions: UpdateDraftRentalDeliveryDecisionsSchema.omit({
      policyException: true,
    }).optional(),
  }).superRefine((value, context) => {
    if (
      value.fulfillmentMethod === "PICKUP" &&
      (value.deliveryIntent || value.deliveryDecisions)
    ) {
      context.addIssue({
        code: "custom",
        path: ["deliveryIntent"],
        message: "Pickup cannot include delivery inputs.",
      });
    }
  });

const routedDelivery = z.object({
  arrangement: z.literal("ROUTED"),
  source: z.enum(["STORED", "EVALUATED"]),
  technicalFailure: z
    .enum([
      "BRANCH_UNAVAILABLE",
      "BRANCH_LOCATION_MISSING",
      "CUSTOMER_LOCATION_UNRESOLVED",
      "NO_ROUTE",
      "INVALID_PERIOD",
    ])
    .nullable(),
  restrictions: z.array(DeliveryRestrictionSchema),
  policyExceptionRequired: z.boolean(),
  requirements: z.array(
    z.enum([
      "DESTINATION_REQUIRED",
      "AGREEMENT_DECISION_REQUIRED",
      "AGREEMENT_REQUIRED",
      "INVALID_AGREEMENT_AMOUNT",
      "KEEP_REQUIRES_EXISTING_AGREEMENT",
      "AUTOMATIC_QUOTE_REQUIRED",
      "CURRENCY_DECISION_REQUIRED",
      "CURRENCY_MISMATCH",
      "TRANSPORT_RESERVATION_MINUTES_REQUIRED",
      "TRANSPORT_RESERVATION_MINUTES_CONFLICT",
    ]),
  ),
  resolvedDestination: DeliveryResolvedDestinationSchema.nullable(),
  distanceMeters: z.number().nonnegative().nullable(),
  currency: z.string().nullable(),
  delivery: AcceptedDeliveryLegSchema.nullable(),
  collection: AcceptedDeliveryLegSchema.nullable(),
  transportReservationMinutes: z.number().int().nonnegative().nullable(),
  calculatedCharge: z.string().nullable(),
  staffAgreedAmount: z.string().nullable(),
  staffAgreement: DeliveryStaffAgreementSchema.optional(),
  effectiveCharge: z.string().nullable(),
});

export const PreviewDraftRentalCostDeliverySchema = z.discriminatedUnion(
  "arrangement",
  [
    routedDelivery,
    z.strictObject({
      arrangement: z.literal("STAFF_ARRANGED"),
      source: z.enum(["STORED", "PROPOSED"]),
      technicalFailure: z.null(),
      restrictions: z.array(z.never()),
      policyExceptionRequired: z.literal(false),
      requirements: z.array(z.literal("CURRENCY_MISMATCH")),
      deliveryDetails: RentalDeliveryDetailsSchema,
      resolvedDestination: DeliveryResolvedDestinationSchema.nullable(),
      distanceMeters: z.null(),
      currency: z.string(),
      delivery: StaffArrangedDeliveryLegSchema,
      collection: StaffArrangedDeliveryLegSchema,
      transportReservationMinutes: z.number().int().nonnegative(),
      calculatedCharge: z.null(),
      staffAgreement: DeliveryStaffAgreementSchema.optional(),
      staffAgreedAmount: z.string(),
      effectiveCharge: z.string().nullable(),
    }),
  ],
);

export const PreviewDraftRentalCostResponseSchema = z.object({
  pricing: CalculateDraftRentalPriceResponseSchema.extend({
    insurance: z.object({ applied: z.boolean(), amount: z.string() }),
    totalBeforeInsurance: z.string(),
    total: z.string(),
  }),
  delivery: PreviewDraftRentalCostDeliverySchema.nullable(),
  pendingDelivery: z
    .object({
      arrangement: z.enum(["ROUTED", "STAFF_ARRANGED"]),
      reason: z.enum(["INPUT_REQUIRED", "INVALID_TERMS"]),
    })
    .optional(),
  customerTotal: z.string().nullable(),
  currency: z.string(),
  draftVersion: z.number().int().nonnegative().optional(),
});

export type PreviewDraftRentalCostBodyDto = z.input<
  typeof PreviewDraftRentalCostBodySchema
>;
export type PreviewDraftRentalCostDeliveryDto = z.infer<
  typeof PreviewDraftRentalCostDeliverySchema
>;
export type PreviewDraftRentalCostResponseDto = z.infer<
  typeof PreviewDraftRentalCostResponseSchema
>;

export const previewDraftRentalCostContract = {
  method: "POST",
  path: "/rental-commitments/draft-rentals/preview-cost",
  body: PreviewDraftRentalCostBodySchema,
  response: PreviewDraftRentalCostResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof PreviewDraftRentalCostBodySchema,
  typeof PreviewDraftRentalCostResponseSchema
>;
