import { z } from "zod";

import type { ApiContract } from "../../api-contract";

export const CustomerGoogleHandoffBodySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  codeVerifier: z.string().min(43).max(128).optional(),
});

export const CustomerGoogleHandoffResponseSchema = z.object({
  ticket: z.string().min(1),
  canonicalHost: z.string().min(1),
});

export type CustomerGoogleHandoffBodyDto = z.infer<typeof CustomerGoogleHandoffBodySchema>;
export type CustomerGoogleHandoffResponseDto = z.infer<typeof CustomerGoogleHandoffResponseSchema>;

export const customerGoogleHandoffContract = {
  method: "POST",
  path: "/auth/customer/google/handoff",
  body: CustomerGoogleHandoffBodySchema,
  response: CustomerGoogleHandoffResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof CustomerGoogleHandoffBodySchema, typeof CustomerGoogleHandoffResponseSchema>;
