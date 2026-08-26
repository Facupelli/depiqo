import type { CreatePromotionResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { promotionKeys } from "../promotion.queries";
import {
	type CreatePromotionVariables,
	createPromotion,
} from "./create-promotion.api";

type CreatePromotionOptions = Omit<
	MutationOptions<
		CreatePromotionResponseDto,
		ProblemDetailsError,
		CreatePromotionVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreatePromotion(options?: CreatePromotionOptions) {
	return useMutation<
		CreatePromotionResponseDto,
		ProblemDetailsError,
		CreatePromotionVariables
	>({
		...options,
		mutationFn: createPromotion,
		meta: {
			invalidates: promotionKeys.all(),
			...options?.meta,
		},
	});
}
