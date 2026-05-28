import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { CreateBranchBodySchema, CreateBranchScheduleBodySchema } from "./create-branch.contract";

export const UpdateBranchParamsSchema = z.object({
  branchId: z.string(),
});

export const UpdateBranchScheduleBodySchema = CreateBranchScheduleBodySchema;

export const UpdateBranchBodySchema = CreateBranchBodySchema;

export const UpdateBranchResponseSchema = z.object({
  id: z.string(),
});

export type UpdateBranchParamsDto = z.infer<typeof UpdateBranchParamsSchema>;
export type UpdateBranchScheduleBodyDto = z.infer<
  typeof UpdateBranchScheduleBodySchema
>;
export type UpdateBranchBodyDto = z.infer<typeof UpdateBranchBodySchema>;
export type UpdateBranchResponseDto = z.infer<typeof UpdateBranchResponseSchema>;

export const updateBranchContract = {
  method: "PUT",
  path: "/v2/tenant-management/branches/:branchId",
  params: UpdateBranchParamsSchema,
  body: UpdateBranchBodySchema,
  response: UpdateBranchResponseSchema,
} satisfies ApiContract<
  typeof UpdateBranchParamsSchema,
  undefined,
  undefined,
  typeof UpdateBranchBodySchema,
  typeof UpdateBranchResponseSchema
>;
