import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { BranchOperationalLocationSchema } from "./branch-operational-location.schema";

export const GetBranchesQuerySchema = z.object({
  isActive: z
    .preprocess((value) => {
      if (value === undefined || value === null || value === "") {
        return undefined;
      }
      if (value === true || value === "true") {
        return true;
      }
      if (value === false || value === "false") {
        return false;
      }
      return value;
    }, z.boolean().optional()),
});

export const GetBranchesBranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  operationalLocation: BranchOperationalLocationSchema.nullable(),
  timezone: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const GetBranchesResponseSchema = z.array(GetBranchesBranchSchema);

export type GetBranchesQueryDto = z.infer<typeof GetBranchesQuerySchema>;
export type GetBranchesBranchDto = z.infer<typeof GetBranchesBranchSchema>;
export type GetBranchesResponseDto = z.infer<typeof GetBranchesResponseSchema>;

export const getBranchesContract = {
  method: "GET",
  path: "/tenant-management/branches",
  query: GetBranchesQuerySchema,
  response: GetBranchesResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetBranchesQuerySchema,
  undefined,
  undefined,
  typeof GetBranchesResponseSchema
>;
