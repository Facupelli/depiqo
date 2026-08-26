import { z } from "zod";

import type { ApiContract } from "../../api-contract";
import { AuthActorSchema } from "./login.contract";

export const GetCurrentUserResponseSchema = AuthActorSchema;

export type GetCurrentUserResponseDto = z.infer<typeof GetCurrentUserResponseSchema>;

export const getCurrentUserContract = {
  method: "GET",
  path: "/auth/me",
  response: GetCurrentUserResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof GetCurrentUserResponseSchema>;
