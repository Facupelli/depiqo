import { createServerFn } from "@tanstack/react-start";
import { getStorefrontCategories } from "./get-storefront-categories.api";

export const getStorefrontCategoriesFn = createServerFn({
	method: "GET",
}).handler(async () => getStorefrontCategories());
