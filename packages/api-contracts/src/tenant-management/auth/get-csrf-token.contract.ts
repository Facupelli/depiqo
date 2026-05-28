import { z } from "zod";

import type { ApiContract } from "../../api-contract";

export const GetCsrfTokenResponseSchema = z.object({
  csrfToken: z.string().min(1),
});

export type GetCsrfTokenResponseDto = z.infer<typeof GetCsrfTokenResponseSchema>;

export const getCsrfTokenContract = {
  method: "GET",
  path: "/v2/auth/csrf",
  response: GetCsrfTokenResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof GetCsrfTokenResponseSchema>;
