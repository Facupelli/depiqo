import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { GetBranchDetailParamsSchema } from "./get-branch-detail.contract";

const path = "/tenant-management/branches/:branchId/rental-asset-buffer";
const bufferMinutes = z.int32().nonnegative();

export const BranchRentalAssetBufferSchema = z.strictObject({
  beforeBufferMinutes: bufferMinutes,
  afterBufferMinutes: bufferMinutes,
});

export type BranchRentalAssetBufferDto = z.infer<typeof BranchRentalAssetBufferSchema>;

const noContent = z.null();

export const getBranchRentalAssetBufferContract = {
  method: "GET",
  path,
  params: GetBranchDetailParamsSchema,
  response: BranchRentalAssetBufferSchema,
} satisfies ApiContract<
  typeof GetBranchDetailParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof BranchRentalAssetBufferSchema
>;

export const putBranchRentalAssetBufferContract = {
  method: "PUT",
  path,
  params: GetBranchDetailParamsSchema,
  body: BranchRentalAssetBufferSchema,
  response: noContent,
} satisfies ApiContract<
  typeof GetBranchDetailParamsSchema,
  undefined,
  undefined,
  typeof BranchRentalAssetBufferSchema,
  typeof noContent
>;
