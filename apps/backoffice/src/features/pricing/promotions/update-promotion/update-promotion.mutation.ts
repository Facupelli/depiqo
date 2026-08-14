import type { UpdatePromotionResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { promotionKeys } from "../promotions.queries";
import {
	type UpdatePromotionVariables,
	updatePromotion,
} from "./update-promotion.api";

type UpdatePromotionOptions = Omit<
	MutationOptions<
		UpdatePromotionResponseDto,
		ProblemDetailsError,
		UpdatePromotionVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useUpdatePromotion(options?: UpdatePromotionOptions) {
	return useMutation<
		UpdatePromotionResponseDto,
		ProblemDetailsError,
		UpdatePromotionVariables
	>({
		...options,
		mutationFn: updatePromotion,
		meta: {
			invalidates: promotionKeys.all(),
			...options?.meta,
		},
	});
}
