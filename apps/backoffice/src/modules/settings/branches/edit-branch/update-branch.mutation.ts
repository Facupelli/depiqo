import type { UpdateBranchResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { branchKeys } from "../branches.queries";
import { type UpdateBranchVariables, updateBranch } from "./update-branch.api";

type UpdateBranchOptions = Omit<
	MutationOptions<
		UpdateBranchResponseDto,
		ProblemDetailsError,
		UpdateBranchVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useUpdateBranch(options?: UpdateBranchOptions) {
	return useMutation<
		UpdateBranchResponseDto,
		ProblemDetailsError,
		UpdateBranchVariables
	>({
		...options,
		mutationFn: updateBranch,
		meta: {
			invalidates: branchKeys.all(),
			...options?.meta,
		},
	});
}
