import type { CreateContractSignerResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { contractSignerKeys } from "./contract-signer.queries";
import {
	type CreateContractSignerVariables,
	createContractSigner,
} from "./create-contract-signer.api";

type CreateContractSignerOptions = Omit<
	MutationOptions<
		CreateContractSignerResponseDto,
		ProblemDetailsError,
		CreateContractSignerVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateContractSigner(options?: CreateContractSignerOptions) {
	return useMutation<
		CreateContractSignerResponseDto,
		ProblemDetailsError,
		CreateContractSignerVariables
	>({
		...options,
		mutationFn: createContractSigner,
		meta: {
			invalidates: contractSignerKeys.all(),
			...options?.meta,
		},
	});
}
