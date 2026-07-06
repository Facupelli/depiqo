import { z } from "zod";

import type { ApiContract } from "../../api-contract";
import { AuthCustomerSchema } from "./login.contract";

export const CustomerLoginBodySchema = z.object({
  tenantId: z.string().min(1),
  email: z.email(),
  password: z.string().min(1),
});

export const CustomerLoginResponseSchema = z.object({
  customer: AuthCustomerSchema,
  csrfToken: z.string().min(1),
});

export type CustomerLoginBodyDto = z.infer<typeof CustomerLoginBodySchema>;
export type CustomerLoginResponseDto = z.infer<typeof CustomerLoginResponseSchema>;

export const customerLoginContract = {
  method: "POST",
  path: "/auth/customer/login",
  body: CustomerLoginBodySchema,
  response: CustomerLoginResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof CustomerLoginBodySchema, typeof CustomerLoginResponseSchema>;
