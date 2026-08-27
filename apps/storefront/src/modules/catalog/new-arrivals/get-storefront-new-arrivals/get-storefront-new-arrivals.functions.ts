import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { GetStorefrontNewArrivalsInputSchema } from "./get-storefront-new-arrivals.schema";
import { getStorefrontNewArrivals } from "./get-storefront-new-arrivals.server";

export const getStorefrontNewArrivalsFn = createServerFn({ method: "GET" })
	.middleware([storefrontFunctionRequestContextMiddleware])
	.inputValidator((data) => GetStorefrontNewArrivalsInputSchema.parse(data))
	.handler(async ({ data, context }) =>
		getStorefrontNewArrivals(context.storefrontRequest, data),
	);
