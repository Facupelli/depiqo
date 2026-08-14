import {
	type CalculateCartPriceResponseDto,
	CalculateCartPriceResponseSchema,
	calculateCartPriceContract,
} from "@repo/api-contracts";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import { storefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";
import { parseCalculateCartPriceTransportBody } from "./calculate-cart-price.transport";

export async function calculateCartPrice(
	requestContext: StorefrontRequestContext,
	body: unknown,
): Promise<CalculateCartPriceResponseDto> {
	const parsedBody = parseCalculateCartPriceTransportBody(body);
	const response = await storefrontApiFetch(requestContext, {
		path: calculateCartPriceContract.path,
		method: calculateCartPriceContract.method,
		body: parsedBody,
	});
	return CalculateCartPriceResponseSchema.parse(response);
}
