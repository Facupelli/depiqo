import type { UpdateContractSignerResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { contractSignerKeys } from "./contract-signer.queries";
import {
	type UpdateContractSignerVariables,
	updateContractSigner,
} from "./update-contract-signer.api";

type UpdateContractSignerOptions = Omit<
	MutationOptions<
		UpdateContractSignerResponseDto,
		ProblemDetailsError,
		UpdateContractSignerVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useUpdateContractSigner(options?: UpdateContractSignerOptions) {
	return useMutation<
		UpdateContractSignerResponseDto,
		ProblemDetailsError,
		UpdateContractSignerVariables
	>({
		...options,
		mutationFn: updateContractSigner,
		meta: {
			invalidates: contractSignerKeys.all(),
			...options?.meta,
		},
	});
}
