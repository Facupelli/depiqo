import {
	CalculateCartPriceBodySchema,
	type CalculateCartPriceResponseDto,
	CalculateCartPriceResponseSchema,
	calculateCartPriceContract,
} from "@repo/api-contracts";
import { storefrontApiFetch } from "@/lib/api/storefront-api-fetch";

export type CalculateCartPriceVariables = {
	body: unknown;
};

export async function calculateCartPrice({
	body,
}: CalculateCartPriceVariables): Promise<CalculateCartPriceResponseDto> {
	const parsedBody = CalculateCartPriceBodySchema.parse(body);

	const response = await storefrontApiFetch({
		path: calculateCartPriceContract.path as `/storefront/${string}`,
		method: calculateCartPriceContract.method,
		body: parsedBody,
	});

	return CalculateCartPriceResponseSchema.parse(response);
}
