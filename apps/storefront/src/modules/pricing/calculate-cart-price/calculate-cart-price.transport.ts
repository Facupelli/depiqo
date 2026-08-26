import {
	type CalculateCartPriceBodyDto,
	CalculateCartPriceBodySchema,
} from "@repo/api-contracts";

export function parseCalculateCartPriceTransportBody(
	body: unknown,
): CalculateCartPriceBodyDto {
	return CalculateCartPriceBodySchema.parse(body);
}
