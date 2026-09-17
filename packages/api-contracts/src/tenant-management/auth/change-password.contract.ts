import { z } from "zod";

import type { ApiContract } from "../../api-contract";
import { AuthUserSchema } from "./login.contract";

export const ChangePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const ChangePasswordResponseSchema = z.object({
  user: AuthUserSchema,
  csrfToken: z.string().min(1),
});

export type ChangePasswordResponseDto = z.infer<typeof ChangePasswordResponseSchema>;

export const changePasswordContract = {
  method: "POST",
  path: "/auth/change-password",
  body: ChangePasswordBodySchema,
  response: ChangePasswordResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof ChangePasswordBodySchema, typeof ChangePasswordResponseSchema>;
