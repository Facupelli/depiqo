import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const RejectSubmittedCustomerOnboardingParamsSchema = z.object({
  customerId: z.string().uuid(),
});

export const RejectSubmittedCustomerOnboardingBodySchema = z.object({
  rejectionReason: z.string().trim().min(1),
});

export const RejectSubmittedCustomerOnboardingResponseSchema = z.null();

export type RejectSubmittedCustomerOnboardingParamsDto = z.infer<
  typeof RejectSubmittedCustomerOnboardingParamsSchema
>;
export type RejectSubmittedCustomerOnboardingBodyDto = z.infer<
  typeof RejectSubmittedCustomerOnboardingBodySchema
>;
export type RejectSubmittedCustomerOnboardingResponseDto = z.infer<
  typeof RejectSubmittedCustomerOnboardingResponseSchema
>;

export const rejectSubmittedCustomerOnboardingContract = {
  method: "POST",
  path: "/v2/tenant-management/rental-customers/:customerId/onboarding/reject",
  params: RejectSubmittedCustomerOnboardingParamsSchema,
  body: RejectSubmittedCustomerOnboardingBodySchema,
  response: RejectSubmittedCustomerOnboardingResponseSchema,
} satisfies ApiContract<
  typeof RejectSubmittedCustomerOnboardingParamsSchema,
  undefined,
  undefined,
  typeof RejectSubmittedCustomerOnboardingBodySchema,
  typeof RejectSubmittedCustomerOnboardingResponseSchema
>;
