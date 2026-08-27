import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getStorefrontNewArrivalsFn } from "./get-storefront-new-arrivals/get-storefront-new-arrivals.functions";
import type { GetStorefrontNewArrivalsInputDto } from "./get-storefront-new-arrivals/get-storefront-new-arrivals.schema";

export type NewArrivalsQueryInput = GetStorefrontNewArrivalsInputDto;

export const newArrivalsKeys = {
	all: () => ["storefront", "new-arrivals"] as const,
	detail: ({ branchId, windowDays }: NewArrivalsQueryInput) =>
		[...newArrivalsKeys.all(), branchId, windowDays] as const,
};

export const newArrivalsQueries = {
	detail: (input: NewArrivalsQueryInput) =>
		queryOptions({
			queryKey: newArrivalsKeys.detail(input),
			queryFn: () => getStorefrontNewArrivalsFn({ data: input }),
		}),
};

export function useNewArrivals(input: NewArrivalsQueryInput) {
	return useSuspenseQuery(newArrivalsQueries.detail(input));
}
