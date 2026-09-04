import {
	type ProspectiveCartCostResponseDto,
	ProspectiveCartCostResponseSchema,
	prospectiveCartCostContract,
} from "@repo/api-contracts";
import type { StorefrontRequestContext } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";
import { storefrontApiFetch } from "@/shared/server/storefront-transport/storefront-api-fetch.server";
import { parseProspectiveCartCostTransportBody } from "./prospective-cart-cost.transport";

export async function calculateProspectiveCartCost(
	requestContext: StorefrontRequestContext,
	body: unknown,
): Promise<ProspectiveCartCostResponseDto> {
	const parsedBody = parseProspectiveCartCostTransportBody(body);
	const response = await storefrontApiFetch(requestContext, {
		path: prospectiveCartCostContract.path,
		method: prospectiveCartCostContract.method,
		body: parsedBody,
	});
	return ProspectiveCartCostResponseSchema.parse(response);
}
