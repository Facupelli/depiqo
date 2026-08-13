import type { CreateRatePlanResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { ratePlanKeys } from "@/features/pricing/rate-plans/rate-plans.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { createRatePlan } from "./create-rate-plan.api";

export function useCreateRatePlan(
	options?: Omit<
		MutationOptions<
			CreateRatePlanResponseDto,
			ProblemDetailsError,
			Parameters<typeof createRatePlan>[0]
		>,
		"mutationFn" | "mutationKey"
	>,
) {
	return useMutation({
		...options,
		mutationFn: createRatePlan,
		meta: { invalidates: [ratePlanKeys.all()], ...options?.meta },
	});
}
