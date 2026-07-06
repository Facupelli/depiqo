import type { GetRentalAccessoryDefaultsResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getRentalAccessoryDefaults } from "./get-rental-accessory-defaults/get-rental-accessory-defaults.api";

export type RentalAccessoryDefaultsQueryOverrides<
	TData = GetRentalAccessoryDefaultsResponseDto,
> = Omit<
	UseQueryOptions<
		GetRentalAccessoryDefaultsResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const rentalAccessoryDefaultKeys = {
	all: () => ["v2", "asset-inventory", "rental-accessory-defaults"] as const,
	details: () => [...rentalAccessoryDefaultKeys.all(), "detail"] as const,
	detail: (rentalId: string) =>
		[...rentalAccessoryDefaultKeys.details(), rentalId] as const,
};

export const rentalAccessoryDefaultQueries = {
	detail: <TData = GetRentalAccessoryDefaultsResponseDto>(
		rentalId: string,
		overrides?: RentalAccessoryDefaultsQueryOverrides<TData>,
	) =>
		queryOptions<
			GetRentalAccessoryDefaultsResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: rentalAccessoryDefaultKeys.detail(rentalId),
			queryFn: () => getRentalAccessoryDefaults(rentalId),
			enabled: rentalId.length > 0,
			...overrides,
		}),
};

export function useRentalAccessoryDefaults<
	TData = GetRentalAccessoryDefaultsResponseDto,
>(rentalId: string, overrides?: RentalAccessoryDefaultsQueryOverrides<TData>) {
	return useQuery(rentalAccessoryDefaultQueries.detail(rentalId, overrides));
}
