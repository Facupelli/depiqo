import type { CustomerLoginBodyDto } from "@repo/api-contracts";
import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { customerProfileKeys } from "../customer/customer-profile.queries";
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
	const queryClient = useQueryClient();
	const router = useRouter();
	return useMutation({
		mutationFn: (body: CustomerLoginBodyDto) => loginCustomer(body),
		onSuccess: async () => {
			queryClient.removeQueries({ queryKey: customerProfileKeys.all() });
			await router.invalidate({ sync: true });
		},
		meta: { invalidates: customerAuthKeys.current() },
	});
}

export function useCustomerLogout() {
	const queryClient = useQueryClient();
	const router = useRouter();
	return useMutation({
		mutationFn: logoutCustomer,
		onSuccess: async () => {
			queryClient.removeQueries({ queryKey: customerProfileKeys.all() });
			await router.invalidate();
		},
		meta: { invalidates: customerAuthKeys.current() },
	});
}
