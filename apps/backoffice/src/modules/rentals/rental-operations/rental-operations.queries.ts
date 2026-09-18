import type {
	GetRentalOperationsQueryDto,
	GetRentalOperationsResponseDto,
} from "@repo/api-contracts";
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getRentalOperations } from "./get-rental-operations.api";

export const rentalOperationsKeys = {
	all: () => ["v2", "rental-commitment", "rentals", "operations"] as const,
	operations: (input?: GetRentalOperationsQueryDto) =>
		[...rentalOperationsKeys.all(), input ?? null] as const,
};

export const rentalOperationsQueries = {
	operations: (input?: GetRentalOperationsQueryDto) =>
		queryOptions<GetRentalOperationsResponseDto, ProblemDetailsError>({
			queryKey: rentalOperationsKeys.operations(input),
			queryFn: () => {
				if (!input) {
					throw new Error("input is required to fetch rental operations.");
				}

				return getRentalOperations(input);
			},
			enabled: Boolean(input),
		}),
};

export function useRentalOperations(input?: GetRentalOperationsQueryDto) {
	return useQuery(rentalOperationsQueries.operations(input));
}
