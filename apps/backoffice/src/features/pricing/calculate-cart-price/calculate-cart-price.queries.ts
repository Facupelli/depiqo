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

export type CalculateCartPriceQueryOverrides<
	TData = CalculateCartPriceResponseDto,
> = Omit<
	UseQueryOptions<CalculateCartPriceResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const cartPriceKeys = {
	all: () => ["v2", "pricing", "cart-price"] as const,
	calculations: () => [...cartPriceKeys.all(), "calculation"] as const,
	calculation: (body?: CalculateCartPriceBodyDto | null) =>
		[...cartPriceKeys.calculations(), body ?? null] as const,
};

export const cartPriceQueries = {
	calculate: <TData = CalculateCartPriceResponseDto>(
		body?: CalculateCartPriceBodyDto | null,
		overrides?: CalculateCartPriceQueryOverrides<TData>,
	) =>
		queryOptions<CalculateCartPriceResponseDto, ProblemDetailsError, TData>({
			...overrides,
			queryKey: cartPriceKeys.calculation(body),
			queryFn: () => {
				if (!body) {
					throw new Error(
						"Cart price body is required to calculate cart price.",
					);
				}

				return calculateCartPriceFn({ data: body });
			},
			enabled: !!body && (overrides?.enabled ?? true),
		}),
};

export function useCalculatedCartPrice<TData = CalculateCartPriceResponseDto>(
	body?: CalculateCartPriceBodyDto | null,
	overrides?: CalculateCartPriceQueryOverrides<TData>,
) {
	return useQuery(cartPriceQueries.calculate(body, overrides));
}
