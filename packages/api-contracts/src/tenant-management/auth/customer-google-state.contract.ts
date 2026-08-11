import { z } from "zod";

import type { ApiContract } from "../../api-contract";

export const CustomerGoogleStateBodySchema = z.object({
  redirectPath: z.string().min(1).startsWith("/").refine((value) => !value.startsWith("//")),
});

export const CustomerGoogleStateResponseSchema = z.object({
  state: z.string().min(1),
});

export type CustomerGoogleStateBodyDto = z.infer<typeof CustomerGoogleStateBodySchema>;
export type CustomerGoogleStateResponseDto = z.infer<typeof CustomerGoogleStateResponseSchema>;

export const customerGoogleStateContract = {
  method: "POST",
  path: "/auth/customer/google/state",
  body: CustomerGoogleStateBodySchema,
  response: CustomerGoogleStateResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof CustomerGoogleStateBodySchema, typeof CustomerGoogleStateResponseSchema>;
