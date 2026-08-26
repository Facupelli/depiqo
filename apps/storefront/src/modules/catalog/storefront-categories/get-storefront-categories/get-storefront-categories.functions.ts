import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { getStorefrontCategories } from "./get-storefront-categories.api";

export const getStorefrontCategoriesFn = createServerFn({
	method: "GET",
})
	.middleware([storefrontFunctionRequestContextMiddleware])
	.handler(async ({ context }) =>
		getStorefrontCategories(context.storefrontRequest),
	);
