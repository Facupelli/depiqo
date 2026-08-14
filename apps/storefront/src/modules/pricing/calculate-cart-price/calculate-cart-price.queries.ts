import type {
	CalculateCartPriceBodyDto,
	CalculateCartPriceResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { calculateCartPriceFn } from "./calculate-cart-price.functions";

type Overrides = Omit<
	UseQueryOptions<CalculateCartPriceResponseDto, ProblemDetailsError>,
	"queryKey" | "queryFn"
>;
export const cartPriceKeys = {
	all: () => ["pricing", "cart-price"] as const,
	calculation: (body: CalculateCartPriceBodyDto | null) =>
		[...cartPriceKeys.all(), body] as const,
};
export const cartPriceQueries = {
	calculate: (body: CalculateCartPriceBodyDto | null, overrides?: Overrides) =>
		queryOptions<CalculateCartPriceResponseDto, ProblemDetailsError>({
			...overrides,
			queryKey: cartPriceKeys.calculation(body),
			queryFn: () => {
				if (!body) throw new Error("Cart price input is required");
				return calculateCartPriceFn({ data: body });
			},
			enabled: !!body && (overrides?.enabled ?? true),
		}),
};
export function useCalculatedCartPrice(body: CalculateCartPriceBodyDto | null) {
	return useQuery(cartPriceQueries.calculate(body));
}
