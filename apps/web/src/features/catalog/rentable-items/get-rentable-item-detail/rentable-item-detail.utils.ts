import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";

const kindLabels = {
	SINGLE: "Individual",
	PACKAGE: "Paquete",
	KIT: "Kit",
} satisfies Partial<Record<GetRentableItemDetailResponseDto["kind"], string>>;

const billingUnitLabels: Record<"HOUR" | "DAY" | "WEEK", string> = {
	HOUR: "hora",
	DAY: "día",
	WEEK: "semana",
};

export type OfferMetrics = {
	total: number;
	ready: number;
	missingPricing: number;
	hidden: number;
};

export function getKindLabel(
	kind: GetRentableItemDetailResponseDto["kind"],
): string {
	return kindLabels[kind as keyof typeof kindLabels] ?? kind;
}

export function getOfferMetrics(
	offers: GetRentableItemDetailResponseDto["offers"],
): OfferMetrics {
	return offers.reduce<OfferMetrics>(
		(metrics, offer) => ({
			total: metrics.total + 1,
			ready: metrics.ready + (offer.setupSummary.status === "READY" ? 1 : 0),
			missingPricing:
				metrics.missingPricing +
				(offer.setupSummary.issues.includes("MISSING_PRICING") ? 1 : 0),
			hidden: metrics.hidden + (!offer.isVisible ? 1 : 0),
		}),
		{ total: 0, ready: 0, missingPricing: 0, hidden: 0 },
	);
}

export function getStartingPrice(item: GetRentableItemDetailResponseDto) {
	const prices = item.offers.flatMap((offer) => {
		const plan = offer.activeRatePlan;
		const firstTier = plan?.tiers[0];
		return plan && firstTier
			? [
					{
						amount: Number(firstTier.pricePerUnit),
						currency: plan.currency,
						unit: plan.billingUnit,
					},
				]
			: [];
	});
	const lowest = prices
		.filter((price) => Number.isFinite(price.amount))
		.sort((a, b) => a.amount - b.amount)[0];
	return lowest
		? `Desde ${formatCurrency(String(lowest.amount), lowest.currency)} / ${billingUnitLabels[lowest.unit]}`
		: null;
}

export function formatPriceSummary(
	summary: GetRentableItemDetailResponseDto["offers"][number]["setupSummary"]["priceSummary"],
) {
	return summary
		? `Desde ${formatCurrency(summary.startingPrice, summary.currency)} / ${billingUnitLabels[summary.billingUnit]}`
		: "Sin precio configurado";
}

function formatCurrency(amount: string, currency: string) {
	const numericAmount = Number(amount);
	if (!Number.isFinite(numericAmount)) return `${currency} ${amount}`;
	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(numericAmount);
}
