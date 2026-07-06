import type { GetAssetSummariesResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getAssetSummaries } from "./get-asset-summaries/get-asset-summaries.api";

export type AssetSummariesQueryOverrides<
	TData = GetAssetSummariesResponseDto,
> = Omit<
	UseQueryOptions<GetAssetSummariesResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const assetKeys = {
	all: () => ["v2", "asset-inventory", "assets"] as const,
	summaries: (ids: string[]) => [...assetKeys.all(), "summaries", ids] as const,
};

export const assetQueries = {
	summaries: <TData = GetAssetSummariesResponseDto>(
		ids: string[],
		overrides?: AssetSummariesQueryOverrides<TData>,
	) =>
		queryOptions<GetAssetSummariesResponseDto, ProblemDetailsError, TData>({
			queryKey: assetKeys.summaries(ids),
			queryFn: () => getAssetSummaries(ids),
			enabled: ids.length > 0,
			...overrides,
		}),
};

export function useAssetSummaries<TData = GetAssetSummariesResponseDto>(
	ids: string[],
	overrides?: AssetSummariesQueryOverrides<TData>,
) {
	return useQuery(assetQueries.summaries(ids, overrides));
}
