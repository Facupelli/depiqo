import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";

const billingUnitLabels: Record<"HOUR" | "DAY" | "WEEK", string> = {
	HOUR: "hora",
	DAY: "día",
	WEEK: "semana",
};

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
