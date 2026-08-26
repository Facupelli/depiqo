import type {
	GetRentalOfferAvailabilityRequestDto,
	GetRentalOfferAvailabilityResponseDto,
} from "@repo/api-contracts";
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query";
import { getRentalOfferAvailability } from "@/modules/rentals/shared/rental-offers/get-rental-offer-availability.api";
import type { ProblemDetailsError } from "@/shared/errors";

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
		[...rentalOfferAvailabilityKeys.availability(), input] as const,
};

export const rentalOfferAvailabilityQueries = {
	forInput: <TData = GetRentalOfferAvailabilityResponseDto>(
		input: RentalOfferAvailabilityInputDto,
		overrides?: RentalOfferAvailabilityQueryOverrides<TData>,
	) =>
		queryOptions({
			queryKey: rentalOfferAvailabilityKeys.forInput(input),
			queryFn: () => getRentalOfferAvailability(input),
			enabled: input.rentalOfferIds.length > 0,
			...overrides,
		}),
};
