import type { CalculateCartPriceResponseDto } from "@repo/api-contracts";

export type PricedLineId = string;

export type PromotionPresentation = {
	promotionId: string;
	name: string;
	totalAmount: string;
	affectedLines: ReadonlyMap<PricedLineId, string>;
	placement: "ORDER" | "LINES";
};

export function derivePromotionPresentations(
	pricing: CalculateCartPriceResponseDto,
): PromotionPresentation[] {
	const linesByReference = new Map(
		pricing.lines.map((line) => [line.lineReference, line]),
	);

	return pricing.appliedPromotions.map((promotion) => {
		const affectedLines = new Map<PricedLineId, string>();

		for (const lineReference of promotion.affectedLineReferences) {
			const line = linesByReference.get(lineReference);
			const adjustment = line?.appliedAdjustments.find(
				(candidate) => candidate.promotionId === promotion.promotionId,
			);
			if (adjustment) affectedLines.set(lineReference, adjustment.amount);
		}

		return {
			promotionId: promotion.promotionId,
			name: promotion.name,
			totalAmount: promotion.amount,
			affectedLines,
			placement:
				promotion.affectedLineReferences.length === pricing.lines.length &&
				pricing.lines.length > 0 &&
				promotion.affectedLineReferences.every((lineReference) =>
					linesByReference.has(lineReference),
				)
					? "ORDER"
					: "LINES",
		};
	});
}
