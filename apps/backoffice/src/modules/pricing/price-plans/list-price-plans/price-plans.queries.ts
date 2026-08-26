import type {
	GetRatePlansQueryDto,
	GetRatePlansResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getPricePlans } from "./get-price-plans.api";

export type PricePlansQueryOverrides<TData = GetRatePlansResponseDto> = Omit<
	UseQueryOptions<GetRatePlansResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const pricePlanKeys = {
	all: () => ["v2", "pricing", "rate-plans"] as const,
	lists: () => [...pricePlanKeys.all(), "list"] as const,
	list: (query?: GetRatePlansQueryDto) =>
		[...pricePlanKeys.lists(), query ?? {}] as const,
};

export const pricePlanQueries = {
	list: <TData = GetRatePlansResponseDto>(
		query?: GetRatePlansQueryDto,
		overrides?: PricePlansQueryOverrides<TData>,
	) =>
		queryOptions<GetRatePlansResponseDto, ProblemDetailsError, TData>({
			queryKey: pricePlanKeys.list(query),
			queryFn: () => getPricePlans(query),
			...overrides,
		}),
};

export function usePricePlans<TData = GetRatePlansResponseDto>(
	query?: GetRatePlansQueryDto,
	overrides?: PricePlansQueryOverrides<TData>,
) {
	return useQuery(pricePlanQueries.list(query, overrides));
}
