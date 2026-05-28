import { z } from "zod";

import type { ApiContract } from "../../api-contract";
import { AuthCustomerSchema } from "./login.contract";

export const CustomerGoogleFinalizeBodySchema = z.object({
  ticket: z.string().min(1),
});

export const CustomerGoogleFinalizeResponseSchema = z.object({
  customer: AuthCustomerSchema,
  csrfToken: z.string().min(1),
});

export type CustomerGoogleFinalizeBodyDto = z.infer<typeof CustomerGoogleFinalizeBodySchema>;
export type CustomerGoogleFinalizeResponseDto = z.infer<typeof CustomerGoogleFinalizeResponseSchema>;

export const customerGoogleFinalizeContract = {
  method: "POST",
  path: "/v2/auth/customer/google/finalize",
  body: CustomerGoogleFinalizeBodySchema,
  response: CustomerGoogleFinalizeResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof CustomerGoogleFinalizeBodySchema, typeof CustomerGoogleFinalizeResponseSchema>;
