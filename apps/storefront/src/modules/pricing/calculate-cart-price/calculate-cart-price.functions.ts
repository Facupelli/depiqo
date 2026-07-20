import { CalculateCartPriceBodySchema } from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { calculateCartPrice } from "./calculate-cart-price.api";

export const calculateCartPriceFn = createServerFn({ method: "POST" })
	.validator((data) => CalculateCartPriceBodySchema.parse(data))
	.handler(({ data }) => calculateCartPrice(data));
