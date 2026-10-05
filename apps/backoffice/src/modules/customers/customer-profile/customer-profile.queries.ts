import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { customerKeys } from "../customer.query-keys";
import { getBackofficeCustomerProfile } from "./customer-profile.api";

export const customerProfileQueries = {
	detail: (customerId: string) =>
		queryOptions({
			queryKey: customerKeys.backofficeProfile(customerId),
			queryFn: () => getBackofficeCustomerProfile(customerId),
		}),
};

export function useCustomerProfile(customerId: string) {
	return useSuspenseQuery(customerProfileQueries.detail(customerId));
}
