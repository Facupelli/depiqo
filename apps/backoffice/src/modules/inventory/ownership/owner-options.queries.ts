import type { GetOwnersResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getOwnerOptions } from "./owner-options.api";

export type OwnerOptionsQueryOverrides<TData = GetOwnersResponseDto> = Omit<
	UseQueryOptions<GetOwnersResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const ownerOptionKeys = {
	all: () => ["v2", "asset-inventory", "owners"] as const,
	list: () => [...ownerOptionKeys.all(), "list"] as const,
};

export const ownerOptionQueries = {
	list: <TData = GetOwnersResponseDto>(
		overrides?: OwnerOptionsQueryOverrides<TData>,
	) =>
		queryOptions<GetOwnersResponseDto, ProblemDetailsError, TData>({
			queryKey: ownerOptionKeys.list(),
			queryFn: () => getOwnerOptions(),
			...overrides,
		}),
};

export function useOwnerOptions<TData = GetOwnersResponseDto>(
	overrides?: OwnerOptionsQueryOverrides<TData>,
) {
	return useQuery(ownerOptionQueries.list(overrides));
}
