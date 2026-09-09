import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { productKeys } from "../products.queries";
import { getRentableItemDetail } from "./get-rentable-item-detail.api";

export type RentableItemDetailQueryOverrides<
	TData = GetRentableItemDetailResponseDto,
> = Omit<
	UseQueryOptions<GetRentableItemDetailResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const rentableItemDetailQueries = {
	detail: <TData = GetRentableItemDetailResponseDto>(
		rentableItemId?: string,
		overrides?: RentableItemDetailQueryOverrides<TData>,
	) =>
		queryOptions<GetRentableItemDetailResponseDto, ProblemDetailsError, TData>({
			queryKey: productKeys.detail(rentableItemId),
			queryFn: () => {
				if (!rentableItemId) {
					throw new Error(
						"rentableItemId is required to fetch product detail.",
					);
				}

				return getRentableItemDetail(rentableItemId);
			},
			enabled: !!rentableItemId,
			...overrides,
		}),
};
