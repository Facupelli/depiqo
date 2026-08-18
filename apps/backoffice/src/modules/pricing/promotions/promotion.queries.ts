import type {
	GetPromotionDetailResponseDto,
	GetPromotionsQueryDto,
	GetPromotionsResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
	useSuspenseQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getPromotionDetail } from "./edit-promotion/get-promotion-detail.api";
import { getPromotions } from "./list-promotions/get-promotions.api";

export type PromotionsQueryOverrides<TData = GetPromotionsResponseDto> = Omit<
	UseQueryOptions<GetPromotionsResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type PromotionQueryOverrides<TData = GetPromotionDetailResponseDto> =
	Omit<
		UseQueryOptions<GetPromotionDetailResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

export const promotionKeys = {
	all: () => ["v2", "pricing", "promotions"] as const,
	details: () => [...promotionKeys.all(), "detail"] as const,
	detail: (promotionId: string) =>
		[...promotionKeys.details(), promotionId] as const,
	lists: () => [...promotionKeys.all(), "list"] as const,
	list: (query?: GetPromotionsQueryDto) =>
		[...promotionKeys.lists(), query ?? {}] as const,
};

export const promotionQueries = {
	detail: <TData = GetPromotionDetailResponseDto>(
		promotionId: string,
		overrides?: PromotionQueryOverrides<TData>,
	) =>
		queryOptions<GetPromotionDetailResponseDto, ProblemDetailsError, TData>({
			queryKey: promotionKeys.detail(promotionId),
			queryFn: () => getPromotionDetail({ promotionId }),
			...overrides,
		}),
	list: <TData = GetPromotionsResponseDto>(
		query?: GetPromotionsQueryDto,
		overrides?: PromotionsQueryOverrides<TData>,
	) =>
		queryOptions<GetPromotionsResponseDto, ProblemDetailsError, TData>({
			queryKey: promotionKeys.list(query),
			queryFn: () => getPromotions(query),
			...overrides,
		}),
};

export function usePromotions<TData = GetPromotionsResponseDto>(
	query?: GetPromotionsQueryDto,
	overrides?: PromotionsQueryOverrides<TData>,
) {
	return useQuery(promotionQueries.list(query, overrides));
}

export function useSuspensePromotion<TData = GetPromotionDetailResponseDto>(
	promotionId: string,
	overrides?: PromotionQueryOverrides<TData>,
) {
	return useSuspenseQuery(promotionQueries.detail(promotionId, overrides));
}
