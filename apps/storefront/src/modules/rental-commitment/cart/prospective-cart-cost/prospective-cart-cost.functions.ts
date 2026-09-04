import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { calculateProspectiveCartCost } from "./prospective-cart-cost.api";
import { parseProspectiveCartCostTransportBody } from "./prospective-cart-cost.transport";

export const calculateProspectiveCartCostFn = createServerFn({ method: "POST" })
	.middleware([storefrontFunctionRequestContextMiddleware])
	.inputValidator(parseProspectiveCartCostTransportBody)
	.handler(({ data, context }) =>
		calculateProspectiveCartCost(context.storefrontRequest, data),
	);
