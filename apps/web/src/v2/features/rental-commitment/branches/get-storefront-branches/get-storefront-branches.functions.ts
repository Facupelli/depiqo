import { createServerFn } from "@tanstack/react-start";
import { getStorefrontBranches } from "./get-storefront-branches.api";

export const getStorefrontBranchesFn = createServerFn({
	method: "GET",
}).handler(async () => getStorefrontBranches());
