import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getStorefrontRentalOfferListViewFn } from "@/modules/catalog/rental-offers/get-storefront-rental-offer-list-view/get-storefront-rental-offer-list-view.functions";

const NEW_ARRIVALS_PAGE_SIZE = 12;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

export interface NewArrivalsQueryInput {
	branchId: string;
	windowDays: number;
}

export const newArrivalsKeys = {
	all: () => ["storefront", "new-arrivals"] as const,
	detail: ({ branchId, windowDays }: NewArrivalsQueryInput) =>
		[...newArrivalsKeys.all(), branchId, windowDays] as const,
};

export const newArrivalsQueries = {
	detail: (input: NewArrivalsQueryInput) =>
		queryOptions({
			queryKey: newArrivalsKeys.detail(input),
			queryFn: async () => {
				const publishedAfter = new Date(
					Date.now() - input.windowDays * MILLISECONDS_PER_DAY,
				).toISOString();

				const result = await getStorefrontRentalOfferListViewFn({
					data: {
						branchId: input.branchId,
						kind: "SINGLE",
						publishedAfter,
						sort: "PUBLISHED_AT_DESC",
						page: 1,
						pageSize: NEW_ARRIVALS_PAGE_SIZE,
					},
				});

				return result.singles.data;
			},
		}),
};

export function useNewArrivals(input: NewArrivalsQueryInput) {
	return useSuspenseQuery(newArrivalsQueries.detail(input));
}
