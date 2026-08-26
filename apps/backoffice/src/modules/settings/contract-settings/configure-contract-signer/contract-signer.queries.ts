import type { GetContractSignerResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getContractSigner } from "./get-contract-signer.api";

export type ContractSignerQueryOverrides<TData = GetContractSignerResponseDto> =
	Omit<
		UseQueryOptions<GetContractSignerResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

export const contractSignerKeys = {
	all: () => ["v2", "tenant-management", "tenant", "contract-signer"] as const,
};

export const contractSignerQueries = {
	current: <TData = GetContractSignerResponseDto>(
		overrides?: ContractSignerQueryOverrides<TData>,
	) =>
		queryOptions<GetContractSignerResponseDto, ProblemDetailsError, TData>({
			queryKey: contractSignerKeys.all(),
			queryFn: getContractSigner,
			...overrides,
		}),
};

export function useContractSigner<TData = GetContractSignerResponseDto>(
	overrides?: ContractSignerQueryOverrides<TData>,
) {
	return useQuery(contractSignerQueries.current(overrides));
}
