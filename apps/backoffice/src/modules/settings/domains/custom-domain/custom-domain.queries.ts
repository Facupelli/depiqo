import type { GetCustomDomainResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getCustomDomain } from "./get-custom-domain.api";

export type CustomDomainQueryOverrides<TData = GetCustomDomainResponseDto> =
	Omit<
		UseQueryOptions<GetCustomDomainResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

export const customDomainKeys = {
	all: () => ["v2", "tenant-management", "tenant"] as const,
	customDomain: () => [...customDomainKeys.all(), "custom-domain"] as const,
};

export const customDomainQueries = {
	customDomain: <TData = GetCustomDomainResponseDto>(
		overrides?: CustomDomainQueryOverrides<TData>,
	) =>
		queryOptions<GetCustomDomainResponseDto, ProblemDetailsError, TData>({
			queryKey: customDomainKeys.customDomain(),
			queryFn: getCustomDomain,
			...overrides,
		}),
};

export function useCustomDomain<TData = GetCustomDomainResponseDto>(
	overrides?: CustomDomainQueryOverrides<TData>,
) {
	return useQuery(customDomainQueries.customDomain(overrides));
}
