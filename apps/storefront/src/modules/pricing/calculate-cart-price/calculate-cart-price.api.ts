import {
	CalculateCartPriceBodySchema,
	type CalculateCartPriceResponseDto,
	CalculateCartPriceResponseSchema,
	calculateCartPriceContract,
} from "@repo/api-contracts";
import { storefrontApiFetch } from "@/lib/api/storefront-api-fetch";

export async function calculateCartPrice(
	body: unknown,
): Promise<CalculateCartPriceResponseDto> {
	const parsedBody = CalculateCartPriceBodySchema.parse(body);
	const response = await storefrontApiFetch({
		path: calculateCartPriceContract.path,
		method: calculateCartPriceContract.method,
		body: parsedBody,
	});
	return CalculateCartPriceResponseSchema.parse(response);
}
