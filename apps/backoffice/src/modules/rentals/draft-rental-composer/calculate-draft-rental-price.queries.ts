import type {
	CalculateDraftRentalPriceBodyDto,
	CalculateDraftRentalPriceResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import { getCsrfToken } from "@/lib/api/csrf-token";
import type { ProblemDetailsError } from "@/shared/errors";
import { calculateDraftRentalPrice } from "./calculate-draft-rental-price.api";

export type CalculateDraftRentalPriceQueryOverrides<
	TData = CalculateDraftRentalPriceResponseDto,
> = Omit<
	UseQueryOptions<
		CalculateDraftRentalPriceResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const draftRentalPriceKeys = {
	all: () => ["v2", "pricing", "draft-rental-price"] as const,
	calculations: () => [...draftRentalPriceKeys.all(), "calculation"] as const,
	calculation: (body?: CalculateDraftRentalPriceBodyDto | null) =>
		[...draftRentalPriceKeys.calculations(), body ?? null] as const,
};

export const draftRentalPriceQueries = {
	calculate: <TData = CalculateDraftRentalPriceResponseDto>(
		body?: CalculateDraftRentalPriceBodyDto | null,
		overrides?: CalculateDraftRentalPriceQueryOverrides<TData>,
	) =>
		queryOptions<
			CalculateDraftRentalPriceResponseDto,
			ProblemDetailsError,
			TData
		>({
			...overrides,
			queryKey: draftRentalPriceKeys.calculation(body),
			queryFn: async () => {
				if (!body) {
					throw new Error(
						"Draft rental price body is required to calculate draft rental price.",
					);
				}

				return calculateDraftRentalPrice({
					body,
					headers:
						typeof window !== "undefined"
							? { "x-csrf-token": await getCsrfToken() }
							: undefined,
				});
			},
			enabled: !!body && (overrides?.enabled ?? true),
		}),
};

export function useCalculatedDraftRentalPrice<
	TData = CalculateDraftRentalPriceResponseDto,
>(
	body?: CalculateDraftRentalPriceBodyDto | null,
	overrides?: CalculateDraftRentalPriceQueryOverrides<TData>,
) {
	return useQuery(draftRentalPriceQueries.calculate(body, overrides));
}
