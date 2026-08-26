import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { calculateCartPrice } from "./calculate-cart-price.api";
import { parseCalculateCartPriceTransportBody } from "./calculate-cart-price.transport";

export const calculateCartPriceFn = createServerFn({ method: "POST" })
	.middleware([storefrontFunctionRequestContextMiddleware])
	.inputValidator(parseCalculateCartPriceTransportBody)
	.handler(({ data, context }) =>
		calculateCartPrice(context.storefrontRequest, data),
	);
