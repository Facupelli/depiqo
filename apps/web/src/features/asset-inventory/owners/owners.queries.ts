import type {
	GetOwnerDetailResponseDto,
	GetOwnersResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getOwnerDetail } from "./get-owner-detail/get-owner-detail.api";
import { getOwners } from "./get-owners/get-owners.api";

export type OwnersQueryOverrides<TData = GetOwnersResponseDto> = Omit<
	UseQueryOptions<GetOwnersResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type OwnerDetailQueryOverrides<TData = GetOwnerDetailResponseDto> = Omit<
	UseQueryOptions<GetOwnerDetailResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const ownerKeys = {
	all: () => ["v2", "asset-inventory", "owners"] as const,
	lists: () => [...ownerKeys.all(), "list"] as const,
	list: () => [...ownerKeys.lists()] as const,
	details: () => [...ownerKeys.all(), "detail"] as const,
	detail: (ownerId?: string) => [...ownerKeys.details(), ownerId] as const,
};

export const ownerQueries = {
	list: <TData = GetOwnersResponseDto>(
		overrides?: OwnersQueryOverrides<TData>,
	) =>
		queryOptions<GetOwnersResponseDto, ProblemDetailsError, TData>({
			queryKey: ownerKeys.list(),
			queryFn: () => getOwners(),
			...overrides,
		}),
	detail: <TData = GetOwnerDetailResponseDto>(
		ownerId?: string,
		overrides?: OwnerDetailQueryOverrides<TData>,
	) =>
		queryOptions<GetOwnerDetailResponseDto, ProblemDetailsError, TData>({
			queryKey: ownerKeys.detail(ownerId),
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

export function useOwners<TData = GetOwnersResponseDto>(
	overrides?: OwnersQueryOverrides<TData>,
) {
	return useQuery(ownerQueries.list(overrides));
}

export function useOwnerDetail<TData = GetOwnerDetailResponseDto>(
	ownerId?: string,
	overrides?: OwnerDetailQueryOverrides<TData>,
) {
	return useQuery(ownerQueries.detail(ownerId, overrides));
}
