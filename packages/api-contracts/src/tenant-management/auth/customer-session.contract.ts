import { z } from "zod";

import type { ApiContract } from "../../api-contract";
import { AuthCustomerSchema } from "./login.contract";

export const GetCurrentCustomerResponseSchema = AuthCustomerSchema;
export type GetCurrentCustomerResponseDto = z.infer<typeof GetCurrentCustomerResponseSchema>;

export const getCurrentCustomerContract = {
  method: "GET",
  path: "/auth/customer/me",
  response: GetCurrentCustomerResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof GetCurrentCustomerResponseSchema>;

export const CustomerLogoutResponseSchema = z.void();
export type CustomerLogoutResponseDto = z.infer<typeof CustomerLogoutResponseSchema>;

export const customerLogoutContract = {
  method: "POST",
  path: "/auth/customer/logout",
  response: CustomerLogoutResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof CustomerLogoutResponseSchema>;
