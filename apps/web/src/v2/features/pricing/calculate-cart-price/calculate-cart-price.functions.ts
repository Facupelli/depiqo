import { CalculateCartPriceBodySchema } from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { calculateCartPrice } from "./calculate-cart-price.api";

export const calculateCartPriceFn = createServerFn({
	method: "POST",
})
	.inputValidator((data) => CalculateCartPriceBodySchema.parse(data))
	.handler(async ({ data }) => calculateCartPrice({ body: data }));
