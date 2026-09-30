import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { formatExactCurrencyRate } from "@/shared/utils/formatters";

const billingUnitLabels: Record<"HOUR" | "DAY" | "WEEK", string> = {
	HOUR: "hora",
	DAY: "día",
	WEEK: "semana",
};

export function formatPriceSummary(
	summary: GetRentableItemDetailResponseDto["offers"][number]["setupSummary"]["priceSummary"],
) {
	return summary
		? `Desde ${formatExactCurrencyRate(summary.startingPrice, summary.currency)} / ${billingUnitLabels[summary.billingUnit]}`
		: "Sin precio configurado";
}
