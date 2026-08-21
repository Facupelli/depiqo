import type {
	GetAssetsQueryDto,
	GetAssetsResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getAssets } from "./assets.api";

export type AssetsQueryOverrides<TData = GetAssetsResponseDto> = Omit<
	UseQueryOptions<GetAssetsResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

const assetKeys = {
	all: () => ["v2", "asset-inventory", "assets"] as const,
	list: (filters?: GetAssetsQueryDto) =>
		[...assetKeys.all(), filters ?? {}] as const,
};

export const assetQueries = {
	list: <TData = GetAssetsResponseDto>(
		filters?: GetAssetsQueryDto,
		overrides?: AssetsQueryOverrides<TData>,
	) =>
		queryOptions<GetAssetsResponseDto, ProblemDetailsError, TData>({
			queryKey: assetKeys.list(filters),
			queryFn: () => getAssets(filters),
			...overrides,
		}),
};

export function useAssets<TData = GetAssetsResponseDto>(
	filters?: GetAssetsQueryDto,
	overrides?: AssetsQueryOverrides<TData>,
) {
	return useQuery(assetQueries.list(filters, overrides));
}
