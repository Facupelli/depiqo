import { createServerFn } from "@tanstack/react-start";
import { storefrontFunctionRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/function-request-context.middleware";
import { GetStorefrontEquipmentInputSchema } from "./get-storefront-equipment.schema";
import { getStorefrontEquipment } from "./get-storefront-equipment.server";

export const getStorefrontEquipmentFn = createServerFn({ method: "GET" })
	.middleware([storefrontFunctionRequestContextMiddleware])
	.inputValidator((data) => GetStorefrontEquipmentInputSchema.parse(data))
	.handler(async ({ data, context }) =>
		getStorefrontEquipment(context.storefrontRequest, data),
	);
