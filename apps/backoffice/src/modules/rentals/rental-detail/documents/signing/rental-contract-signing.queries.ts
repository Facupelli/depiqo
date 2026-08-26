import type { GetRentalContractSigningSummaryResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getRentalContractSigningSummary } from "./get-rental-contract-signing-summary.api";

export type RentalContractSigningSummaryQueryOverrides<
	TData = GetRentalContractSigningSummaryResponseDto,
> = Omit<
	UseQueryOptions<
		GetRentalContractSigningSummaryResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const contractKeys = {
	all: () => ["v2", "contracts"] as const,
	rentalSigningSummaries: () =>
		[...contractKeys.all(), "rental-signing-summary"] as const,
	rentalSigningSummary: (rentalId: string) =>
		[...contractKeys.rentalSigningSummaries(), rentalId] as const,
};

export const contractQueries = {
	rentalSigningSummary: <TData = GetRentalContractSigningSummaryResponseDto>(
		rentalId: string,
		overrides?: RentalContractSigningSummaryQueryOverrides<TData>,
	) =>
		queryOptions<
			GetRentalContractSigningSummaryResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: contractKeys.rentalSigningSummary(rentalId),
			queryFn: () => getRentalContractSigningSummary(rentalId),
			enabled: rentalId.length > 0,
			...overrides,
		}),
};

export function useRentalContractSigningSummary<
	TData = GetRentalContractSigningSummaryResponseDto,
>(
	rentalId: string,
	overrides?: RentalContractSigningSummaryQueryOverrides<TData>,
) {
	return useQuery(
		contractQueries.rentalSigningSummary<TData>(rentalId, overrides),
	);
}
