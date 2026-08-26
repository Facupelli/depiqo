import type { CorrectRatePlanResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { productKeys } from "@/modules/products/products.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { pricePlanKeys } from "../list-price-plans/price-plans.queries";
import {
	type EditPricePlanVariables,
	editPricePlan,
} from "./edit-price-plan.api";

type EditPricePlanOptions = Omit<
	MutationOptions<
		CorrectRatePlanResponseDto,
		ProblemDetailsError,
		EditPricePlanVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useEditPricePlan(options?: EditPricePlanOptions) {
	return useMutation({
		...options,
		mutationFn: editPricePlan,
		meta: {
			invalidates: [pricePlanKeys.all(), productKeys.all()],
			...options?.meta,
		},
	});
}
