import type { CreateOwnerWithContractResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { ownerKeys } from "../owners.queries";
import {
	type CreateOwnerWithContractVariables,
	createOwnerWithContract,
} from "./create-owner-with-contract.api";

type CreateOwnerWithContractOptions = Omit<
	MutationOptions<
		CreateOwnerWithContractResponseDto,
		ProblemDetailsError,
		CreateOwnerWithContractVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateOwnerWithContract(
	options?: CreateOwnerWithContractOptions,
) {
	return useMutation<
		CreateOwnerWithContractResponseDto,
		ProblemDetailsError,
		CreateOwnerWithContractVariables
	>({
		...options,
		mutationFn: createOwnerWithContract,
		meta: {
			invalidates: ownerKeys.all(),
			...options?.meta,
		},
	});
}
