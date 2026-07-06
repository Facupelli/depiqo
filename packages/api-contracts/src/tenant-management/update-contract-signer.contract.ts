import type { ApiContract } from "../api-contract";
import {
  ContractSignerBodySchema,
  ContractSignerMutationResponseSchema,
  type ContractSignerBodyDto,
  type ContractSignerMutationResponseDto,
} from "./contract-signer.contract";

export { ContractSignerBodySchema as UpdateContractSignerBodySchema };
export { ContractSignerMutationResponseSchema as UpdateContractSignerResponseSchema };
export type UpdateContractSignerBodyDto = ContractSignerBodyDto;
export type UpdateContractSignerResponseDto = ContractSignerMutationResponseDto;

export const updateContractSignerContract = {
  method: "PUT",
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
