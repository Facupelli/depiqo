import type { GetCurrentCustomerResponseDto } from "@repo/api-contracts";
import { redirect } from "@tanstack/react-router";
import { resolveCustomerReturnTo } from "./customer-return-to";
import { getCurrentCustomerForStorefront } from "./get-current-customer.function";

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
