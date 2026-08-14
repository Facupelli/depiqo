import {
	queryOptions,
	type UseQueryOptions,
	useSuspenseQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { rentalKeys } from "../rentals.queries";
import { getRentalDetailViewFn } from "./get-rental-detail-view/get-rental-detail-view.functions";
import type { GetRentalDetailViewResponseDto } from "./get-rental-detail-view/get-rental-detail-view.schema";

export type RentalDetailViewQueryOverrides<
	TData = GetRentalDetailViewResponseDto,
> = Omit<
	UseQueryOptions<GetRentalDetailViewResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const rentalDetailViewKeys = {
	detail: (rentalId: string) =>
		[...rentalKeys.detail(rentalId), "view"] as const,
};

export const rentalDetailViewQueries = {
	detail: <TData = GetRentalDetailViewResponseDto>(
		rentalId: string,
		overrides?: RentalDetailViewQueryOverrides<TData>,
	) =>
		queryOptions<GetRentalDetailViewResponseDto, ProblemDetailsError, TData>({
			queryKey: rentalDetailViewKeys.detail(rentalId),
			queryFn: () => getRentalDetailViewFn({ data: { rentalId } }),
			enabled: rentalId.length > 0,
			...overrides,
		}),
};

export function useRentalDetailView<TData = GetRentalDetailViewResponseDto>(
	rentalId: string,
	overrides?: RentalDetailViewQueryOverrides<TData>,
) {
	return useSuspenseQuery(rentalDetailViewQueries.detail(rentalId, overrides));
}
