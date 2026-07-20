import {
	type CalculateCartPriceBodyDto,
	CalculateCartPriceBodySchema,
} from "@repo/api-contracts";

export type CartPriceInput = {
	branchId: string | null | undefined;
	periodStart: Date | null;
	periodEnd: Date | null;
	selectedOffers: CalculateCartPriceBodyDto["selectedOffers"];
	insuranceSelected: boolean;
	couponCode: string;
};

export function toCalculateCartPriceBody(
	input: CartPriceInput,
): CalculateCartPriceBodyDto | null {
	if (
		!input.branchId ||
		!input.periodStart ||
		!input.periodEnd ||
		input.selectedOffers.length === 0 ||
		input.periodEnd <= input.periodStart
	)
		return null;
	const result = CalculateCartPriceBodySchema.safeParse({
		branchId: input.branchId,
		rentalPeriod: {
			start: input.periodStart.toISOString(),
			end: input.periodEnd.toISOString(),
		},
		selectedOffers: input.selectedOffers,
		insuranceSelected: input.insuranceSelected,
		couponCode: input.couponCode.trim() || undefined,
	});
	return result.success ? result.data : null;
}
