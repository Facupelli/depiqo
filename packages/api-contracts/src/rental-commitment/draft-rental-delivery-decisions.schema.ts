import { z } from "zod";

// Like equipment pricing targets, amounts must be exactly representable in cents.
// Delivery agreements also allow zero.
const agreementAmount = z.string().trim().regex(/^\d+(?:\.\d+)?$/).refine(
  (value) => /^\d+(?:\.\d{1,2}0*)?$/.test(value),
  "Enter a non-negative amount exactly representable in cents",
);

const setAgreement = z.object({
  type: z.literal("SET"),
  amount: agreementAmount,
  reason: z.string().trim().min(1).optional(),
}).strict();
const clearAgreement = z.object({ type: z.literal("CLEAR") }).strict();
const keepAgreement = z.object({ type: z.literal("KEEP") }).strict();

const commonDecisions = {
  policyException: z.object({
    type: z.literal("AUTHORIZE"),
    reason: z.string().trim().min(1).optional(),
  }).strict().optional(),
  transportReservationMinutes: z.number().int().nonnegative().optional(),
};

export const CreateDraftRentalDeliveryDecisionsSchema = z.object({
  ...commonDecisions,
  pricingAgreement: z.discriminatedUnion("type", [setAgreement, clearAgreement]).optional(),
}).strict();

export const UpdateDraftRentalDeliveryDecisionsSchema = z.object({
  ...commonDecisions,
  pricingAgreement: z.discriminatedUnion("type", [setAgreement, clearAgreement, keepAgreement]).optional(),
}).strict();
