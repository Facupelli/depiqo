import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getCartRentalOfferAvailabilityFn } from "./get-cart-rental-offer-availability.functions";
import type {
	GetCartRentalOfferAvailabilityInput,
	GetCartRentalOfferAvailabilityResponse,
} from "./get-cart-rental-offer-availability.schema";

type CartRentalOfferAvailabilityQueryOverrides = Omit<
	UseQueryOptions<GetCartRentalOfferAvailabilityResponse, ProblemDetailsError>,
	"queryKey" | "queryFn"
>;

export const cartRentalOfferAvailabilityKeys = {
	all: () =>
		["rental-commitment", "cart", "rental-offer-availability"] as const,
	calculation: (input: GetCartRentalOfferAvailabilityInput | null) =>
		[...cartRentalOfferAvailabilityKeys.all(), input] as const,
};

export const cartRentalOfferAvailabilityQueries = {
	calculate: (
		input: GetCartRentalOfferAvailabilityInput | null,
		overrides?: CartRentalOfferAvailabilityQueryOverrides,
	) =>
		queryOptions<GetCartRentalOfferAvailabilityResponse, ProblemDetailsError>({
			...overrides,
			queryKey: cartRentalOfferAvailabilityKeys.calculation(input),
			queryFn: () => {
				if (!input) {
					throw new Error("Cart rental-offer availability input is required");
				}
				return getCartRentalOfferAvailabilityFn({ data: input });
			},
			enabled: !!input && (overrides?.enabled ?? true),
		}),
};

export function useCartRentalOfferAvailability(
	input: GetCartRentalOfferAvailabilityInput | null,
) {
	return useQuery(cartRentalOfferAvailabilityQueries.calculate(input));
}
