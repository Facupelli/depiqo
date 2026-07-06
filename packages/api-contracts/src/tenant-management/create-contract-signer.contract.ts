import type { ApiContract } from "../api-contract";
import {
  ContractSignerBodySchema,
  ContractSignerMutationResponseSchema,
  type ContractSignerBodyDto,
  type ContractSignerMutationResponseDto,
} from "./contract-signer.contract";

export { ContractSignerBodySchema as CreateContractSignerBodySchema };
export { ContractSignerMutationResponseSchema as CreateContractSignerResponseSchema };
export type CreateContractSignerBodyDto = ContractSignerBodyDto;
export type CreateContractSignerResponseDto = ContractSignerMutationResponseDto;

export const createContractSignerContract = {
  method: "POST",
  path: "/tenant-management/tenant/contract-signer",
  body: ContractSignerBodySchema,
  response: ContractSignerMutationResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof ContractSignerBodySchema,
  typeof ContractSignerMutationResponseSchema
>;
