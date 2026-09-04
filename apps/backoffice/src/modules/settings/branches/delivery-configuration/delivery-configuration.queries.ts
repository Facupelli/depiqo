import type { GetBranchDeliveryConfigurationResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getDeliveryConfiguration } from "./delivery-configuration.api";

export const deliveryConfigurationKeys = {
	all: () => ["v2", "delivery", "branch-configuration"] as const,
	detail: (branchId: string) =>
		[...deliveryConfigurationKeys.all(), branchId] as const,
};

type DeliveryConfigurationQueryOverrides = Omit<
	UseQueryOptions<
		GetBranchDeliveryConfigurationResponseDto,
		ProblemDetailsError
	>,
	"queryKey" | "queryFn"
>;

export const deliveryConfigurationQueries = {
	detail: (branchId: string, overrides?: DeliveryConfigurationQueryOverrides) =>
		queryOptions({
			queryKey: deliveryConfigurationKeys.detail(branchId),
			queryFn: () => getDeliveryConfiguration(branchId),
			...overrides,
		}),
};

export function useDeliveryConfiguration(branchId: string) {
	return useQuery(deliveryConfigurationQueries.detail(branchId));
}
