import type { GetRatePlanDetailResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useSuspenseQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { pricePlanKeys } from "../list-price-plans/price-plans.queries";
import { getPricePlanDetail } from "./get-price-plan-detail.api";

export type PricePlanDetailQueryOverrides<
	TData = GetRatePlanDetailResponseDto,
> = Omit<
	UseQueryOptions<GetRatePlanDetailResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const pricePlanDetailQueries = {
	detail: <TData = GetRatePlanDetailResponseDto>(
		ratePlanId: string,
		overrides?: PricePlanDetailQueryOverrides<TData>,
	) =>
		queryOptions<GetRatePlanDetailResponseDto, ProblemDetailsError, TData>({
			queryKey: [...pricePlanKeys.all(), "detail", ratePlanId],
			queryFn: () => getPricePlanDetail(ratePlanId),
			...overrides,
		}),
};

export function usePricePlanDetail<TData = GetRatePlanDetailResponseDto>(
	ratePlanId: string,
	overrides?: PricePlanDetailQueryOverrides<TData>,
) {
	return useSuspenseQuery(pricePlanDetailQueries.detail(ratePlanId, overrides));
}
