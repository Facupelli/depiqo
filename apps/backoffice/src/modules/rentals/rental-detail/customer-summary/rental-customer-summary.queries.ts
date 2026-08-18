import type { GetCustomerSummaryResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getCustomerSummary } from "./get-rental-customer-summary.api";

export type CustomerSummaryQueryOverrides<
	TData = GetCustomerSummaryResponseDto,
> = Omit<
	UseQueryOptions<GetCustomerSummaryResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const rentalCustomerKeys = {
	all: () => ["v2", "tenant-management", "rental-customers"] as const,
	summary: (customerId?: string) =>
		[...rentalCustomerKeys.all(), "summary", customerId] as const,
};

export const rentalCustomerQueries = {
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

export function useCustomerSummary<TData = GetCustomerSummaryResponseDto>(
	customerId?: string,
	overrides?: CustomerSummaryQueryOverrides<TData>,
) {
	return useQuery(rentalCustomerQueries.summary(customerId, overrides));
}
