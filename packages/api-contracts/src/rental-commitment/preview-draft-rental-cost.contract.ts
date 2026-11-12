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
import {
  UpdateDraftRentalDeliveryDecisionsSchema,
  validateNewStaffArrangedDeliveryDecisions,
} from "./draft-rental-delivery-decisions.schema";
import { UpdateDraftRentalDeliveryIntentSchema } from "./update-draft-rental.contract";

// A complete proposed selection, not a patch. rentalId only supplies stored delivery context.
export const PreviewDraftRentalCostBodySchema =
  CalculateDraftRentalPriceBodySchema.extend({
    rentalId: z.string().trim().min(1).optional(),
    insuranceSelected: z.boolean().default(false),
    fulfillmentMethod: z.enum(["PICKUP", "DELIVERY"]),
    // Omission preserves the draft destination, including a staff-arranged free-text address.
    // New destinations explicitly establish their arrangement and terms.
    deliveryIntent: UpdateDraftRentalDeliveryIntentSchema.optional(),
    // A preview cannot request authorization or supply attribution.
    deliveryDecisions: UpdateDraftRentalDeliveryDecisionsSchema.omit({
      policyException: true,
    }).optional(),
  }).superRefine((value, context) => {
    if (
      value.deliveryIntent?.type === "NEW_DESTINATION" &&
      value.deliveryIntent.arrangement === "STAFF_ARRANGED"
    ) {
      validateNewStaffArrangedDeliveryDecisions(
        value.deliveryDecisions,
        context,
      );
    }
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
  // STORED terms are preserved, not freshly evaluated for confirmation eligibility.
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
  // For STORED terms, these are the restrictions recorded in the existing exception.
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
  // When an agreement requirement is unresolved, this is the existing amount for review only.
  // Only effectiveCharge participates in customerTotal.
  staffAgreedAmount: z.string().nullable(),
  // Only accepted agreements have attribution; a proposed SET has not been accepted.
  staffAgreement: DeliveryStaffAgreementSchema.optional(),
  effectiveCharge: z.string().nullable(),
});

// Stored staff-arranged facts are context only, never fresh operational validation.
export const PreviewDraftRentalCostDeliverySchema = z.discriminatedUnion(
  "arrangement",
  [
    routedDelivery,
    z.strictObject({
      arrangement: z.literal("STAFF_ARRANGED"),
      source: z.literal("STORED"),
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
      staffAgreement: DeliveryStaffAgreementSchema,
      staffAgreedAmount: z.string(),
      effectiveCharge: z.string().nullable(),
    }),
  ],
);

export const PreviewDraftRentalCostResponseSchema = z.object({
  // Equipment-only calculated/final breakdowns, followed by insurance composition.
  pricing: CalculateDraftRentalPriceResponseSchema.extend({
    insurance: z.object({ applied: z.boolean(), amount: z.string() }),
    totalBeforeInsurance: z.string(),
    total: z.string(),
  }),
  delivery: PreviewDraftRentalCostDeliverySchema.nullable(),
  // Null when the charge cannot be determined. A total is not permission to save or confirm.
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
