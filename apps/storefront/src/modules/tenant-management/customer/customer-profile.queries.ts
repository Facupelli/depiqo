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
	current: () => [...customerProfileKeys.all(), "current"] as const,
};

export const customerProfileQueries = {
	current: () =>
		queryOptions<
			GetCurrentRentalCustomerProfileResponseDto | null,
			ProblemDetailsError
		>({
			queryKey: customerProfileKeys.current(),
			queryFn: getCurrentRentalCustomerProfile,
		}),
};

export function useCurrentRentalCustomerProfile() {
	return useQuery({
		...customerProfileQueries.current(),
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
