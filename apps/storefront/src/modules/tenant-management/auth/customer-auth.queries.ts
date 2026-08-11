import type { CustomerLoginBodyDto } from "@repo/api-contracts";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import {
	getCurrentCustomer,
	loginCustomer,
	logoutCustomer,
} from "./customer-auth.api";

export const customerAuthKeys = {
	all: () => ["storefront", "customer-auth"] as const,
	current: () => [...customerAuthKeys.all(), "current"] as const,
};

export const customerAuthQueries = {
	current: () =>
		queryOptions({
			queryKey: customerAuthKeys.current(),
			queryFn: getCurrentCustomer,
			staleTime: 30_000,
		}),
};

export function useCurrentCustomer() {
	return useQuery({
		...customerAuthQueries.current(),
		enabled: typeof window !== "undefined",
	});
}

export function useCustomerLogin() {
	return useMutation({
		mutationFn: (body: CustomerLoginBodyDto) => loginCustomer(body),
		meta: { invalidates: customerAuthKeys.current() },
	});
}

export function useCustomerLogout() {
	return useMutation({
		mutationFn: logoutCustomer,
		meta: { invalidates: customerAuthKeys.current() },
	});
}
