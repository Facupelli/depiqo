import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { GetStorefrontCombosInputSchema } from "./get-storefront-combos.schema";
import { getStorefrontCombos } from "./get-storefront-combos.server";

export const getStorefrontCombosFn = createServerFn({ method: "GET" })
	.middleware([storefrontFunctionRequestContextMiddleware])
	.inputValidator((data) => GetStorefrontCombosInputSchema.parse(data))
	.handler(async ({ data, context }) =>
		getStorefrontCombos(context.storefrontRequest, data),
	);
