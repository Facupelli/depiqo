import type { CreateCategoryResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { categoryKeys } from "../categories.queries";
import {
	type CreateCategoryVariables,
	createCategory,
} from "./create-category.api";

type CreateCategoryOptions = Omit<
	MutationOptions<
		CreateCategoryResponseDto,
		ProblemDetailsError,
		CreateCategoryVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateCategory(options?: CreateCategoryOptions) {
	return useMutation<
		CreateCategoryResponseDto,
		ProblemDetailsError,
		CreateCategoryVariables
	>({
		...options,
		mutationFn: createCategory,
		meta: {
			invalidates: categoryKeys.all(),
			...options?.meta,
		},
	});
}
