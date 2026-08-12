import { CalculateCartPriceBodySchema } from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { calculateCartPrice } from "./calculate-cart-price.api";

export const calculateCartPriceFn = createServerFn({ method: "POST" })
	.middleware([storefrontFunctionRequestContextMiddleware])
	.inputValidator((data) => CalculateCartPriceBodySchema.parse(data))
	.handler(({ data, context }) =>
		calculateCartPrice(context.storefrontRequest, data),
	);
