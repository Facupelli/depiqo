import type {
	GetOrderByIdParamDto,
	OrderAccessoryPreparationResponseDto,
	ProblemDetails,
	SaveOrderAccessoryPreparationDto,
} from "@repo/schemas";
import {
	queryOptions,
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import { ProblemDetailsError } from "@/shared/errors";
import {
	getOrderAccessoryPreparation,
	saveOrderAccessoryPreparation,
} from "../orders.api";
import { orderKeys } from "../orders.keys";

type OrderAccessoryPreparationQueryOptions<
	TData = OrderAccessoryPreparationResponseDto,
> = Omit<
	UseQueryOptions<
		OrderAccessoryPreparationResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

type SaveOrderAccessoryPreparationVariables = {
	params: GetOrderByIdParamDto;
	dto: SaveOrderAccessoryPreparationDto;
};

type SaveOrderAccessoryPreparationMutationOptions = Omit<
	UseMutationOptions<
		void,
		ProblemDetailsError,
		SaveOrderAccessoryPreparationVariables
	>,
	"mutationFn"
>;

export const accessoryPreparationQueries = {
	detail: <TData = OrderAccessoryPreparationResponseDto>(
		params: GetOrderByIdParamDto,
		options?: OrderAccessoryPreparationQueryOptions<TData>,
	) =>
		queryOptions<
			OrderAccessoryPreparationResponseDto,
			ProblemDetailsError,
			TData
		>({
			...options,
			queryKey: orderKeys.accessoryPreparation(params),
			queryFn: () => getOrderAccessoryPreparation({ data: params }),
		}),
};

export function useOrderAccessoryPreparation<
	TData = OrderAccessoryPreparationResponseDto,
>(
	params: GetOrderByIdParamDto,
	options?: OrderAccessoryPreparationQueryOptions<TData>,
) {
	return useQuery({
		...accessoryPreparationQueries.detail(params, options),
	});
}

export function useSaveOrderAccessoryPreparation(
	options?: SaveOrderAccessoryPreparationMutationOptions,
) {
	return useMutation<
		void,
		ProblemDetailsError,
		SaveOrderAccessoryPreparationVariables
	>({
		...options,
		mutationFn: async (data) => {
			const result = await saveOrderAccessoryPreparation({ data });

			if (hasMutationError(result)) {
				throw new ProblemDetailsError(result.error);
			}
		},
		meta: {
			invalidates: (variables) => [
				orderKeys.detail(variables.params),
				orderKeys.accessoryPreparation(variables.params),
			],
		},
	});
}

function hasMutationError(
	result: unknown,
): result is { error: ProblemDetails } {
	return typeof result === "object" && result !== null && "error" in result;
}
