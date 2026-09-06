import { z } from "zod";

import type { ApiContract } from "../../api-contract";
import { AuthCustomerSchema, AuthUserSchema } from "./login.contract";

const WorkingBranchContextSchema = z.object({
  workingBranchId: z.string().nullable(),
});

export const GetCurrentUserResponseSchema = z.discriminatedUnion("actorType", [
  AuthUserSchema.extend(WorkingBranchContextSchema.shape),
  AuthCustomerSchema.extend(WorkingBranchContextSchema.shape),
]);

export type GetCurrentUserResponseDto = z.infer<typeof GetCurrentUserResponseSchema>;

export const getCurrentUserContract = {
  method: "GET",
  path: "/auth/me",
  response: GetCurrentUserResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, undefined, typeof GetCurrentUserResponseSchema>;
