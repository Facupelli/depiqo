import type { CreateRatePlanResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type CreateRatePlanVariables,
	createRatePlan,
} from "./create-rate-plan.api";

type CreateRatePlanOptions = Omit<
	MutationOptions<
		CreateRatePlanResponseDto,
		ProblemDetailsError,
		CreateRatePlanVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateRatePlan(options?: CreateRatePlanOptions) {
	return useMutation<
		CreateRatePlanResponseDto,
		ProblemDetailsError,
		CreateRatePlanVariables
	>({
		...options,
		mutationFn: createRatePlan,
		meta: {
			...options?.meta,
		},
	});
}
