import type {
	GetContractSignerResponseDto,
	GetCurrentTenantResponseDto,
	GetCustomDomainResponseDto,
	GetPublicTenantConfigResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getContractSigner } from "./contract-signer/get-contract-signer/get-contract-signer.api";
import { getCustomDomain } from "./custom-domain/get-custom-domain.api";
import { getCurrentTenant } from "./get-current-tenant/get-current-tenant.api";
import { getPublicTenantConfigFn } from "./get-public-tenant-config/get-public-tenant-config.functions";

export type CurrentTenantQueryOverrides<TData = GetCurrentTenantResponseDto> =
	Omit<
		UseQueryOptions<GetCurrentTenantResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

export type PublicTenantConfigQueryOverrides<
	TData = GetPublicTenantConfigResponseDto,
> = Omit<
	UseQueryOptions<GetPublicTenantConfigResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type CustomDomainQueryOverrides<TData = GetCustomDomainResponseDto> =
	Omit<
		UseQueryOptions<GetCustomDomainResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

export type ContractSignerQueryOverrides<TData = GetContractSignerResponseDto> =
	Omit<
		UseQueryOptions<GetContractSignerResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

export const tenantKeys = {
	all: () => ["v2", "tenant-management", "tenant"] as const,
	current: () => [...tenantKeys.all(), "current"] as const,
	contractSigner: () => [...tenantKeys.all(), "contract-signer"] as const,
	customDomain: () => [...tenantKeys.all(), "custom-domain"] as const,
	publicConfig: () => [...tenantKeys.all(), "public-config"] as const,
};

export const tenantQueries = {
	current: <TData = GetCurrentTenantResponseDto>(
		overrides?: CurrentTenantQueryOverrides<TData>,
	) =>
		queryOptions<GetCurrentTenantResponseDto, ProblemDetailsError, TData>({
			queryKey: tenantKeys.current(),
			queryFn: getCurrentTenant,
			...overrides,
		}),
	publicConfig: <TData = GetPublicTenantConfigResponseDto>(
		overrides?: PublicTenantConfigQueryOverrides<TData>,
	) =>
		queryOptions<GetPublicTenantConfigResponseDto, ProblemDetailsError, TData>({
			queryKey: tenantKeys.publicConfig(),
			queryFn: () => getPublicTenantConfigFn(),
			...overrides,
		}),
	customDomain: <TData = GetCustomDomainResponseDto>(
		overrides?: CustomDomainQueryOverrides<TData>,
	) =>
		queryOptions<GetCustomDomainResponseDto, ProblemDetailsError, TData>({
			queryKey: tenantKeys.customDomain(),
			queryFn: getCustomDomain,
			...overrides,
		}),
	contractSigner: <TData = GetContractSignerResponseDto>(
		overrides?: ContractSignerQueryOverrides<TData>,
	) =>
		queryOptions<GetContractSignerResponseDto, ProblemDetailsError, TData>({
			queryKey: tenantKeys.contractSigner(),
			queryFn: getContractSigner,
			...overrides,
		}),
};

export function useCurrentTenant<TData = GetCurrentTenantResponseDto>(
	overrides?: CurrentTenantQueryOverrides<TData>,
) {
	return useQuery(tenantQueries.current(overrides));
}

export function usePublicTenantConfig<TData = GetPublicTenantConfigResponseDto>(
	overrides?: PublicTenantConfigQueryOverrides<TData>,
) {
	return useQuery(tenantQueries.publicConfig(overrides));
}

export function useCustomDomain<TData = GetCustomDomainResponseDto>(
	overrides?: CustomDomainQueryOverrides<TData>,
) {
	return useQuery(tenantQueries.customDomain(overrides));
}

export function useContractSigner<TData = GetContractSignerResponseDto>(
	overrides?: ContractSignerQueryOverrides<TData>,
) {
	return useQuery(tenantQueries.contractSigner(overrides));
}
