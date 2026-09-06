import { z } from "zod";

import type { ApiContract } from "../../api-contract";

export const UpdateWorkingBranchBodySchema = z.object({
  workingBranchId: z.string().trim().min(1).nullable(),
});

export const UpdateWorkingBranchResponseSchema = z.object({
  workingBranchId: z.string().nullable(),
});

export type UpdateWorkingBranchBodyDto = z.infer<typeof UpdateWorkingBranchBodySchema>;
export type UpdateWorkingBranchResponseDto = z.infer<typeof UpdateWorkingBranchResponseSchema>;

export const updateWorkingBranchContract = {
  method: "PATCH",
  path: "/auth/working-branch",
  body: UpdateWorkingBranchBodySchema,
  response: UpdateWorkingBranchResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof UpdateWorkingBranchBodySchema,
  typeof UpdateWorkingBranchResponseSchema
>;
