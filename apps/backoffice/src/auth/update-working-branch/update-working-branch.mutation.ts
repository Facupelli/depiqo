import type {
	UpdateWorkingBranchBodyDto,
	UpdateWorkingBranchResponseDto,
} from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { v2AuthKeys } from "../auth.queries";
import { updateWorkingBranch } from "./update-working-branch.api";

type UpdateWorkingBranchOptions = Omit<
	MutationOptions<
		UpdateWorkingBranchResponseDto,
		ProblemDetailsError,
		UpdateWorkingBranchBodyDto
	>,
	"mutationFn" | "mutationKey"
>;

export function useUpdateWorkingBranch(options?: UpdateWorkingBranchOptions) {
	return useMutation<
		UpdateWorkingBranchResponseDto,
		ProblemDetailsError,
		UpdateWorkingBranchBodyDto
	>({
		...options,
		mutationFn: updateWorkingBranch,
		meta: {
			invalidates: v2AuthKeys.current(),
			...options?.meta,
		},
	});
}
