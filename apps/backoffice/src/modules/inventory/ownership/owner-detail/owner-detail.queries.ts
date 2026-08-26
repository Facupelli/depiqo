import type { GetOwnerDetailResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { ownerOptionKeys } from "../owner-options.queries";
import { getOwnerDetail } from "./get-owner-detail.api";

export type OwnerDetailQueryOverrides<TData = GetOwnerDetailResponseDto> = Omit<
	UseQueryOptions<GetOwnerDetailResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const ownerDetailKeys = {
	details: () => [...ownerOptionKeys.all(), "detail"] as const,
	detail: (ownerId?: string) =>
		[...ownerDetailKeys.details(), ownerId] as const,
};

export const ownerQueries = {
	detail: <TData = GetOwnerDetailResponseDto>(
		ownerId?: string,
		overrides?: OwnerDetailQueryOverrides<TData>,
	) =>
		queryOptions<GetOwnerDetailResponseDto, ProblemDetailsError, TData>({
			queryKey: ownerDetailKeys.detail(ownerId),
			queryFn: () => {
				if (!ownerId) {
					throw new Error("ownerId is required to fetch owner detail.");
				}

				return getOwnerDetail(ownerId);
			},
			enabled: !!ownerId,
			...overrides,
		}),
};

export function useOwnerDetail<TData = GetOwnerDetailResponseDto>(
	ownerId?: string,
	overrides?: OwnerDetailQueryOverrides<TData>,
) {
	return useQuery(ownerQueries.detail(ownerId, overrides));
}
