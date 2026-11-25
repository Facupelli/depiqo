import { z } from "zod";

const agreementAmount = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d+)?$/)
  .refine(
    (value) => /^\d+(?:\.\d{1,2}0*)?$/.test(value),
    "Enter a non-negative amount exactly representable in cents",
  );

const setAgreement = z
  .object({
    type: z.literal("SET"),
    amount: agreementAmount,
    reason: z.string().trim().min(1).optional(),
  })
  .strict();
const clearAgreement = z.object({ type: z.literal("CLEAR") }).strict();
const keepAgreement = z.object({ type: z.literal("KEEP") }).strict();

const commonDecisions = {
  policyException: z
    .object({
      type: z.literal("AUTHORIZE"),
      reason: z.string().trim().min(1).optional(),
    })
    .strict()
    .optional(),
  transportReservationMinutes: z.number().int().nonnegative().optional(),
};

export const CreateDraftRentalDeliveryDecisionsSchema = z
  .object({
    ...commonDecisions,
    pricingAgreement: z
      .discriminatedUnion("type", [setAgreement, clearAgreement])
      .optional(),
  })
  .strict();

export const UpdateDraftRentalDeliveryDecisionsSchema = z
  .object({
    ...commonDecisions,
    pricingAgreement: z
      .discriminatedUnion("type", [setAgreement, clearAgreement, keepAgreement])
      .optional(),
  })
  .strict();

export function validateStaffArrangedDeliveryEditDecisions(
  decisions:
    | z.infer<typeof UpdateDraftRentalDeliveryDecisionsSchema>
    | undefined,
  context: z.RefinementCtx,
): void {
  if (
    decisions?.pricingAgreement?.type !== "SET" &&
    decisions?.pricingAgreement?.type !== "KEEP"
  ) {
    context.addIssue({
      code: "custom",
      path: ["deliveryDecisions", "pricingAgreement"],
      message: "Changing a staff-arranged destination requires SET or KEEP.",
    });
  }
  if (decisions?.policyException !== undefined) {
    context.addIssue({
      code: "custom",
      path: ["deliveryDecisions", "policyException"],
      message: "Staff-arranged delivery cannot include a policy exception.",
    });
  }
}

export function validateNewStaffArrangedDeliveryDecisions(
  decisions:
    | z.infer<typeof UpdateDraftRentalDeliveryDecisionsSchema>
    | undefined,
  context: z.RefinementCtx,
): void {
  if (decisions?.pricingAgreement?.type !== "SET") {
    context.addIssue({
      code: "custom",
      path: ["deliveryDecisions", "pricingAgreement"],
      message:
        "Establishing staff-arranged delivery requires a SET pricing agreement.",
    });
  }
  if (decisions?.transportReservationMinutes === undefined) {
    context.addIssue({
      code: "custom",
      path: ["deliveryDecisions", "transportReservationMinutes"],
      message:
        "Establishing staff-arranged delivery requires explicit transportation reservation minutes.",
    });
  }
  if (decisions?.policyException !== undefined) {
    context.addIssue({
      code: "custom",
      path: ["deliveryDecisions", "policyException"],
      message: "Staff-arranged delivery cannot include a policy exception.",
    });
  }
}
