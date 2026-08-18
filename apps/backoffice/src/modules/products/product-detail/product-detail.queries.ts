import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { productKeys } from "../products.queries";
import { getProductDetail } from "./get-product-detail.api";

export type ProductDetailQueryOverrides<
	TData = GetRentableItemDetailResponseDto,
> = Omit<
	UseQueryOptions<GetRentableItemDetailResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const productDetailQueries = {
	detail: <TData = GetRentableItemDetailResponseDto>(
		rentableItemId?: string,
		overrides?: ProductDetailQueryOverrides<TData>,
	) =>
		queryOptions<GetRentableItemDetailResponseDto, ProblemDetailsError, TData>({
			queryKey: productKeys.detail(rentableItemId),
			queryFn: () => {
				if (!rentableItemId) {
					throw new Error(
						"rentableItemId is required to fetch product detail.",
					);
				}

				return getProductDetail(rentableItemId);
			},
			enabled: !!rentableItemId,
			...overrides,
		}),
};
