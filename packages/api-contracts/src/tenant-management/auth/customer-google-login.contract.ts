import { z } from "zod";

import type { ApiContract } from "../../api-contract";
import { AuthCustomerSchema } from "./login.contract";

export const CustomerGoogleLoginBodySchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
  state: z.string().min(1),
  codeVerifier: z.string().min(43).max(128).optional(),
});

export const CustomerGoogleLoginResponseSchema = z.object({
  customer: AuthCustomerSchema,
  csrfToken: z.string().min(1),
});

export type CustomerGoogleLoginBodyDto = z.infer<typeof CustomerGoogleLoginBodySchema>;
export type CustomerGoogleLoginResponseDto = z.infer<typeof CustomerGoogleLoginResponseSchema>;

export const customerGoogleLoginContract = {
  method: "POST",
  path: "/v2/auth/customer/google/login",
  body: CustomerGoogleLoginBodySchema,
  response: CustomerGoogleLoginResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof CustomerGoogleLoginBodySchema, typeof CustomerGoogleLoginResponseSchema>;
