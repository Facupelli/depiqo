import type { CreateBranchResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { branchKeys } from "../branch.queries";
import { type CreateBranchVariables, createBranch } from "./create-branch.api";

type CreateBranchOptions = Omit<
	MutationOptions<
		CreateBranchResponseDto,
		ProblemDetailsError,
		CreateBranchVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateBranch(options?: CreateBranchOptions) {
	return useMutation<
		CreateBranchResponseDto,
		ProblemDetailsError,
		CreateBranchVariables
	>({
		...options,
		mutationFn: createBranch,
		meta: {
			invalidates: branchKeys.all(),
			...options?.meta,
		},
	});
}
