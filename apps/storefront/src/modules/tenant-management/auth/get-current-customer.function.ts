import {
	type GetCurrentCustomerResponseDto,
	GetCurrentCustomerResponseSchema,
	getCurrentCustomerContract,
} from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { getProblemDetailsStatus } from "@/shared/errors";
import { storefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";
import { storefrontFunctionRequestContextMiddleware } from "../resolve-public-tenant-context/function-request-context.middleware";

export const getCurrentCustomerForStorefront = createServerFn({
	method: "GET",
})
	.middleware([storefrontFunctionRequestContextMiddleware])
	.handler(
		async ({ context }): Promise<GetCurrentCustomerResponseDto | null> => {
			try {
				const customer =
					await storefrontApiFetch<GetCurrentCustomerResponseDto>(
						context.storefrontRequest,
						{
							path: getCurrentCustomerContract.path,
							method: getCurrentCustomerContract.method,
							headers: customerSessionHeaders(),
						},
					);
				return GetCurrentCustomerResponseSchema.parse(customer);
			} catch (error) {
				if ([401, 403].includes(getProblemDetailsStatus(error) ?? 0)) {
					return null;
				}

				throw error;
			}
		},
	);

function customerSessionHeaders(): HeadersInit | undefined {
	const cookie = getRequestHeader("cookie");
	return cookie ? { cookie } : undefined;
}
