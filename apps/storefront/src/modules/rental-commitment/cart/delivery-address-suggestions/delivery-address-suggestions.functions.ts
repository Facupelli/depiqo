import { SearchStorefrontDeliveryAddressSuggestionsQuerySchema } from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { searchDeliveryAddressSuggestions } from "./delivery-address-suggestions.api";

export const searchDeliveryAddressSuggestionsFn = createServerFn({
	method: "GET",
})
	.middleware([storefrontFunctionRequestContextMiddleware])
	.inputValidator((data) =>
		SearchStorefrontDeliveryAddressSuggestionsQuerySchema.parse(data),
	)
	.handler(({ data, context }) =>
		searchDeliveryAddressSuggestions(context.storefrontRequest, data),
	);
