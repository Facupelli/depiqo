import type {
	SyncTenantBillingUnitsDto,
	TenantBillingUnitListResponse,
} from "@repo/schemas";
import {
	type MutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	createTenantBillingUnit,
	getTenantBillingUnits,
} from "./tenant-billing-unit.api";

type TenantBillingUnitQueryOptions<TData = TenantBillingUnitListResponse> =
	Omit<
		UseQueryOptions<TenantBillingUnitListResponse, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

type TenantBillingUnitMutationOptions = Omit<
	MutationOptions<string, ProblemDetailsError, SyncTenantBillingUnitsDto>,
	"mutationFn" | "mutationKey"
>;

// -----------------------------------------------------

export function createTenantBillingUnitQueryOptions<
	TData = TenantBillingUnitListResponse,
>(
	options?: TenantBillingUnitQueryOptions<TData>,
): UseQueryOptions<TenantBillingUnitListResponse, ProblemDetailsError, TData> {
	return {
		...options,
		queryKey: ["tenant-billing-units"],
		queryFn: () => getTenantBillingUnits(),
	};
}

// -----------------------------------------------------

export function useTenantBillingUnits<TData = TenantBillingUnitListResponse>(
	options?: TenantBillingUnitQueryOptions<TData>,
) {
	return useQuery(createTenantBillingUnitQueryOptions(options));
}

export function useSyncTenantBillingUnits(
	options?: TenantBillingUnitMutationOptions,
) {
	const queryClient = useQueryClient();

	return useMutation<string, ProblemDetailsError, SyncTenantBillingUnitsDto>({
		...options,
		mutationFn: (data) => createTenantBillingUnit({ data }),
		onSuccess: async (data, variables, onMutateResult, context) => {
			await queryClient.invalidateQueries({
				queryKey: createTenantBillingUnitQueryOptions().queryKey,
			});

			await options?.onSuccess?.(data, variables, onMutateResult, context);
		},
		onError: async (error, variables, onMutateResult, context) => {
			await options?.onError?.(error, variables, onMutateResult, context);
		},
	});
}
