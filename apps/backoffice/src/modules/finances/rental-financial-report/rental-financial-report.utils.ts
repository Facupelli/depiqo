import type {
	GetRentalFinancialReportResponseDto,
	RentalFinancialReportTotalsDto,
} from "@repo/api-contracts";
import {
	parsePlainDecimal,
	subtractDecimals,
	sumDecimalStrings,
} from "@/shared/utils/decimal-string";

export const financialReportPeriods = [
	"all",
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
	"11",
	"12",
] as const;
export type FinancialReportPeriod = (typeof financialReportPeriods)[number];
export type FinancialReportInclusions = {
	includeInsurance: boolean;
	includeDelivery: boolean;
};
export type FinancialReportSelection = FinancialReportInclusions & {
	year: number;
	period: FinancialReportPeriod;
};

export const financialReportMonthNames = [
	"Enero",
	"Febrero",
	"Marzo",
	"Abril",
	"Mayo",
	"Junio",
	"Julio",
	"Agosto",
	"Septiembre",
	"Octubre",
	"Noviembre",
	"Diciembre",
];

export function getFinancialReportCalendar(timezone: string, now = new Date()) {
	const parts = new Intl.DateTimeFormat("en", {
		timeZone: timezone,
		year: "numeric",
		month: "numeric",
	}).formatToParts(now);
	return {
		year: Number(parts.find((part) => part.type === "year")?.value),
		month: parts.find((part) => part.type === "month")?.value as Exclude<
			FinancialReportPeriod,
			"all"
		>,
	};
}

export function getDefaultFinancialReportPeriod(
	year: number,
	calendar: ReturnType<typeof getFinancialReportCalendar>,
): FinancialReportPeriod {
	return year === calendar.year ? calendar.month : "all";
}

export function getFinancialReportPeriodLabel(
	period: FinancialReportPeriod,
	year: number,
): string {
	return period === "all"
		? `Todo el año ${year}`
		: `${financialReportMonthNames[Number(period) - 1]} ${year}`;
}

export function getSelectedFinancialReportTotals(
	report: GetRentalFinancialReportResponseDto,
	period: FinancialReportPeriod,
): RentalFinancialReportTotalsDto {
	if (period === "all") return report.totals;
	const selected = report.periods[Number(period) - 1];
	if (!selected)
		throw new Error("The selected financial report month is missing.");
	return selected;
}

/** Rounded to tenths of a percent using exact source amounts. */
export function getOwnerSharePercentage(amount: string, total: string): number {
	const part = parsePlainDecimal(amount);
	const whole = parsePlainDecimal(total);
	if (!part || !whole) throw new Error("Invalid owner share amounts.");
	if (whole.units === 0n) {
		if (part.units !== 0n)
			throw new Error("A nonzero owner share requires a nonzero total.");
		return 0;
	}
	const numerator = part.units * 10n ** BigInt(whole.scale) * 1000n;
	const denominator = whole.units * 10n ** BigInt(part.scale);
	return Number((numerator + denominator / 2n) / denominator) / 10;
}

export function getFinancialReportAmounts(
	totals: RentalFinancialReportTotalsDto,
	inclusions: FinancialReportInclusions,
) {
	const agreed = sumDecimalStrings([
		totals.equipmentAmount,
		inclusions.includeInsurance ? totals.insuranceAmount : "0",
		inclusions.includeDelivery ? totals.deliveryAmount : "0",
	]);
	const customerAmount = parsePlainDecimal(agreed);
	const thirdPartyAmount = parsePlainDecimal(totals.thirdPartyAmount);
	if (!customerAmount || !thirdPartyAmount)
		throw new Error("Invalid report amounts.");
	return {
		agreed,
		thirdParty: totals.thirdPartyAmount,
		retained: subtractDecimals(customerAmount, thirdPartyAmount),
	};
}
