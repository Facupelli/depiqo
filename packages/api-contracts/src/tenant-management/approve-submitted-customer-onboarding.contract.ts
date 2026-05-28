import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const ApproveSubmittedCustomerOnboardingParamsSchema = z.object({
  customerId: z.string().uuid(),
});

export const ApproveSubmittedCustomerOnboardingResponseSchema = z.null();

export type ApproveSubmittedCustomerOnboardingParamsDto = z.infer<
  typeof ApproveSubmittedCustomerOnboardingParamsSchema
>;
export type ApproveSubmittedCustomerOnboardingResponseDto = z.infer<
  typeof ApproveSubmittedCustomerOnboardingResponseSchema
>;

export const approveSubmittedCustomerOnboardingContract = {
  method: "POST",
  path: "/v2/tenant-management/rental-customers/:customerId/onboarding/approve",
  params: ApproveSubmittedCustomerOnboardingParamsSchema,
  response: ApproveSubmittedCustomerOnboardingResponseSchema,
} satisfies ApiContract<
  typeof ApproveSubmittedCustomerOnboardingParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof ApproveSubmittedCustomerOnboardingResponseSchema
>;
