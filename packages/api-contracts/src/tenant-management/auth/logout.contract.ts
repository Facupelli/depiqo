import { z } from "zod";

import type { ApiContract } from "../../api-contract";

export const LogoutResponseSchema = z.void();

export type LogoutResponseDto = z.infer<typeof LogoutResponseSchema>;

export const logoutContract = {
  method: "POST",
  path: "/auth/logout",
  response: LogoutResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof LogoutResponseSchema>;
