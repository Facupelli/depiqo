import {
	CustomerGoogleStateBodySchema,
	CustomerGoogleStateResponseSchema,
	customerGoogleStateContract,
} from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { storefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";
import { storefrontFunctionRequestContextMiddleware } from "../../resolve-public-tenant-context/function-request-context.middleware";

export const createCustomerGoogleState = createServerFn({
	method: "POST",
})
	.middleware([storefrontFunctionRequestContextMiddleware])
	.inputValidator((data) => CustomerGoogleStateBodySchema.parse(data))
	.handler(async ({ context, data }) => {
		const response = await storefrontApiFetch(context.storefrontRequest, {
			path: customerGoogleStateContract.path,
			method: customerGoogleStateContract.method,
			body: data,
		});

		return CustomerGoogleStateResponseSchema.parse(response);
	});
