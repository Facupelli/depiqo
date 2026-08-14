import type {
	GetCustomerSummaryResponseDto,
	GetRentalCustomersQueryDto,
	GetRentalCustomersResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getCustomerSummary } from "./get-customer-summary/get-customer-summary.api";
import { getRentalCustomers } from "./get-rental-customers/get-rental-customers.api";

export type RentalCustomersQueryOverrides<
	TData = GetRentalCustomersResponseDto,
> = Omit<
	UseQueryOptions<GetRentalCustomersResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type CustomerSummaryQueryOverrides<
	TData = GetCustomerSummaryResponseDto,
> = Omit<
	UseQueryOptions<GetCustomerSummaryResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const rentalCustomerKeys = {
	all: () => ["v2", "tenant-management", "rental-customers"] as const,
	lists: () => [...rentalCustomerKeys.all(), "list"] as const,
	list: (query?: GetRentalCustomersQueryDto) =>
		[...rentalCustomerKeys.lists(), query ?? {}] as const,
	summary: (customerId?: string) =>
		[...rentalCustomerKeys.all(), "summary", customerId] as const,
};

export const rentalCustomerQueries = {
	list: <TData = GetRentalCustomersResponseDto>(
		query?: GetRentalCustomersQueryDto,
		overrides?: RentalCustomersQueryOverrides<TData>,
	) =>
		queryOptions<GetRentalCustomersResponseDto, ProblemDetailsError, TData>({
			queryKey: rentalCustomerKeys.list(query),
			queryFn: () => getRentalCustomers(query),
			...overrides,
		}),
	summary: <TData = GetCustomerSummaryResponseDto>(
		customerId?: string,
		overrides?: CustomerSummaryQueryOverrides<TData>,
	) =>
		queryOptions<GetCustomerSummaryResponseDto, ProblemDetailsError, TData>({
			queryKey: rentalCustomerKeys.summary(customerId),
			queryFn: () => {
				if (!customerId) {
					throw new Error("customerId is required to fetch customer summary.");
				}

				return getCustomerSummary(customerId);
			},
			enabled: !!customerId,
			...overrides,
		}),
};

export function useRentalCustomers<TData = GetRentalCustomersResponseDto>(
	query?: GetRentalCustomersQueryDto,
	overrides?: RentalCustomersQueryOverrides<TData>,
) {
	return useQuery(rentalCustomerQueries.list(query, overrides));
}

export function useCustomerSummary<TData = GetCustomerSummaryResponseDto>(
	customerId?: string,
	overrides?: CustomerSummaryQueryOverrides<TData>,
) {
	return useQuery(rentalCustomerQueries.summary(customerId, overrides));
}
