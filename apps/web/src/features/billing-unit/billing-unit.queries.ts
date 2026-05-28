import type { BillingUnitListResponse } from "@repo/schemas";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getBillingUnits } from "./billing-unit.api";

// -----------------------------------------------------
// Key Factory
// -----------------------------------------------------

export const billingUnitKeys = {
	all: () => ["billing-units"] as const,
	lists: () => [...billingUnitKeys.all(), "list"] as const,
};

// -----------------------------------------------------
// Types
// -----------------------------------------------------

type BillingUnitQueryOptions<TData = BillingUnitListResponse> = Omit<
	UseQueryOptions<BillingUnitListResponse, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

// -----------------------------------------------------
// Hooks
// -----------------------------------------------------

export function useBillingUnits<TData = BillingUnitListResponse>(
	options?: BillingUnitQueryOptions<TData>,
) {
	return useQuery({
		...options,
		queryKey: billingUnitKeys.lists(),
		queryFn: () => getBillingUnits(),
	});
}
