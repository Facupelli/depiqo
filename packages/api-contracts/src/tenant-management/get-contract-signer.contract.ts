import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ContractSignerSchema } from "./contract-signer.contract";

export const GetContractSignerResponseSchema = ContractSignerSchema.nullable();

export type GetContractSignerResponseDto = z.infer<
  typeof GetContractSignerResponseSchema
>;

export const getContractSignerContract = {
  method: "GET",
  path: "/tenant-management/tenant/contract-signer",
  response: GetContractSignerResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  undefined,
  typeof GetContractSignerResponseSchema
>;
