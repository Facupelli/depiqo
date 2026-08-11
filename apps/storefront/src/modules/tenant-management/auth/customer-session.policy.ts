import type { GetCurrentCustomerResponseDto } from "@repo/api-contracts";
import { redirect } from "@tanstack/react-router";
import { getCurrentCustomerForStorefront } from "./get-current-customer.function";
import { resolveCustomerReturnTo } from "./customer-return-to";

export async function requireStorefrontCustomerSession(
	returnTo: unknown,
): Promise<GetCurrentCustomerResponseDto> {
	const customer = await getCurrentCustomerForStorefront();
	if (customer) return customer;

	throw redirect({
		to: "/login",
		search: { returnTo: resolveCustomerReturnTo(returnTo) },
	});
}
