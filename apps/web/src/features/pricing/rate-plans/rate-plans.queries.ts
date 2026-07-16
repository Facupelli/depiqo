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
import { getRatePlans } from "./get-rate-plans.api";

export type RatePlansQueryOverrides<TData = GetRatePlansResponseDto> = Omit<
	UseQueryOptions<GetRatePlansResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const ratePlanKeys = {
	all: () => ["v2", "pricing", "rate-plans"] as const,
	lists: () => [...ratePlanKeys.all(), "list"] as const,
	list: (query?: GetRatePlansQueryDto) =>
		[...ratePlanKeys.lists(), query ?? {}] as const,
};

export const ratePlanQueries = {
	list: <TData = GetRatePlansResponseDto>(
		query?: GetRatePlansQueryDto,
		overrides?: RatePlansQueryOverrides<TData>,
	) =>
		queryOptions<GetRatePlansResponseDto, ProblemDetailsError, TData>({
			queryKey: ratePlanKeys.list(query),
			queryFn: () => getRatePlans(query),
			...overrides,
		}),
};

export function useRatePlans<TData = GetRatePlansResponseDto>(
	query?: GetRatePlansQueryDto,
	overrides?: RatePlansQueryOverrides<TData>,
) {
	return useQuery(ratePlanQueries.list(query, overrides));
}
