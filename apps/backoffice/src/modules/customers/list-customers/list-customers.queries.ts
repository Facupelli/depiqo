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
import { customerKeys } from "../customer.query-keys";
import { getCustomers } from "./list-customers.api";

export type CustomersQueryOverrides<TData = GetRentalCustomersResponseDto> =
	Omit<
		UseQueryOptions<GetRentalCustomersResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

export const customerListQueries = {
	list: <TData = GetRentalCustomersResponseDto>(
		query?: GetRentalCustomersQueryDto,
		overrides?: CustomersQueryOverrides<TData>,
	) =>
		queryOptions<GetRentalCustomersResponseDto, ProblemDetailsError, TData>({
			queryKey: customerKeys.list(query),
			queryFn: () => getCustomers(query),
			...overrides,
		}),
};

export function useCustomers<TData = GetRentalCustomersResponseDto>(
	query?: GetRentalCustomersQueryDto,
	overrides?: CustomersQueryOverrides<TData>,
) {
	return useQuery(customerListQueries.list(query, overrides));
}
