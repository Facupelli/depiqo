import type {
	GetRentalOfferAvailabilityRequestDto,
	GetRentalOfferAvailabilityResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getRentalOfferAvailability } from "./get-rental-offer-availability.api";

export type RentalOfferAvailabilityInputDto =
	GetRentalOfferAvailabilityRequestDto;

export type RentalOfferAvailabilityQueryOverrides<
	TData = GetRentalOfferAvailabilityResponseDto,
> = Omit<
	UseQueryOptions<
		GetRentalOfferAvailabilityResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const rentalOfferAvailabilityKeys = {
	all: () => ["v2", "rentals", "rental-offer-availability"] as const,
	availability: () =>
		[...rentalOfferAvailabilityKeys.all(), "availability"] as const,
	forInput: (input: RentalOfferAvailabilityInputDto) =>
		[
			...rentalOfferAvailabilityKeys.availability(),
			normalizeInput(input),
		] as const,
};

export const rentalOfferAvailabilityQueries = {
	forInput: <TData = GetRentalOfferAvailabilityResponseDto>(
		input: RentalOfferAvailabilityInputDto,
		overrides?: RentalOfferAvailabilityQueryOverrides<TData>,
	) => {
		const normalizedInput = normalizeInput(input);

		return queryOptions<
			GetRentalOfferAvailabilityResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: rentalOfferAvailabilityKeys.forInput(normalizedInput),
			queryFn: () => getRentalOfferAvailability(normalizedInput),
			enabled: normalizedInput.rentalOfferIds.length > 0,
			...overrides,
		});
	},
};

export function useRentalOfferAvailability<
	TData = GetRentalOfferAvailabilityResponseDto,
>(
	input: RentalOfferAvailabilityInputDto,
	overrides?: RentalOfferAvailabilityQueryOverrides<TData>,
) {
	return useQuery(rentalOfferAvailabilityQueries.forInput(input, overrides));
}

function normalizeInput(
	input: RentalOfferAvailabilityInputDto,
): RentalOfferAvailabilityInputDto {
	return {
		...input,
		rentalOfferIds: [...new Set(input.rentalOfferIds)].sort(),
	};
}
