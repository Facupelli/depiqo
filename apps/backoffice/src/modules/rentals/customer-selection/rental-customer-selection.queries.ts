import type {
	GetRentalCustomersQueryDto,
	GetRentalCustomersResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getRentalCustomers } from "./get-rental-customers.api";

export type RentalCustomersQueryOverrides<
	TData = GetRentalCustomersResponseDto,
> = Omit<
	UseQueryOptions<GetRentalCustomersResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const rentalCustomerSelectionKeys = {
	all: () => ["v2", "tenant-management", "rental-customers"] as const,
	lists: () => [...rentalCustomerSelectionKeys.all(), "list"] as const,
	list: (query?: GetRentalCustomersQueryDto) =>
		[...rentalCustomerSelectionKeys.lists(), query ?? {}] as const,
};

export const rentalCustomerSelectionQueries = {
	list: <TData = GetRentalCustomersResponseDto>(
		query?: GetRentalCustomersQueryDto,
		overrides?: RentalCustomersQueryOverrides<TData>,
	) =>
		queryOptions<GetRentalCustomersResponseDto, ProblemDetailsError, TData>({
			queryKey: rentalCustomerSelectionKeys.list(query),
			queryFn: () => getRentalCustomers(query),
			...overrides,
		}),
};

export function useRentalCustomers<TData = GetRentalCustomersResponseDto>(
	query?: GetRentalCustomersQueryDto,
	overrides?: RentalCustomersQueryOverrides<TData>,
) {
	return useQuery(rentalCustomerSelectionQueries.list(query, overrides));
}
