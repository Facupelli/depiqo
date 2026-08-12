import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { getStorefrontBranches } from "./get-storefront-branches.api";

export const getStorefrontBranchesFn = createServerFn({
	method: "GET",
})
	.middleware([storefrontFunctionRequestContextMiddleware])
	.handler(async ({ context }) =>
		getStorefrontBranches(context.storefrontRequest),
	);
