import type {
	GetCurrentRentalCustomerProfileResponseDto,
	SubmitCustomerProfileResponseDto,
} from "@repo/api-contracts";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	getCurrentRentalCustomerProfile,
	type SubmitCustomerProfileVariables,
	submitCustomerProfile,
} from "./customer-profile.api";

export const customerProfileKeys = {
	all: () => ["storefront", "customer-profile"] as const,
	current: (tenantId: string, customerId: string) =>
		[...customerProfileKeys.all(), tenantId, customerId, "current"] as const,
};

export const customerProfileQueries = {
	current: (tenantId: string, customerId: string) =>
		queryOptions<
			GetCurrentRentalCustomerProfileResponseDto | null,
			ProblemDetailsError
		>({
			queryKey: customerProfileKeys.current(tenantId, customerId),
			queryFn: getCurrentRentalCustomerProfile,
		}),
};

export function useCurrentRentalCustomerProfile(
	tenantId: string,
	customerId: string,
) {
	return useQuery({
		...customerProfileQueries.current(tenantId, customerId),
		enabled: typeof window !== "undefined",
	});
}

export function useSubmitCustomerProfile() {
	return useMutation<
		SubmitCustomerProfileResponseDto,
		ProblemDetailsError,
		SubmitCustomerProfileVariables
	>({
		mutationFn: submitCustomerProfile,
		meta: { invalidates: customerProfileKeys.all() },
	});
}
