import type { CreateRatePlanResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { pricePlanKeys } from "../list-price-plans/price-plans.queries";
import { createPricePlan } from "./create-price-plan.api";

export function useCreatePricePlan(
	options?: Omit<
		MutationOptions<
			CreateRatePlanResponseDto,
			ProblemDetailsError,
			Parameters<typeof createPricePlan>[0]
		>,
		"mutationFn" | "mutationKey"
	>,
) {
	return useMutation({
		...options,
		mutationFn: createPricePlan,
		meta: { invalidates: [pricePlanKeys.all()], ...options?.meta },
	});
}
