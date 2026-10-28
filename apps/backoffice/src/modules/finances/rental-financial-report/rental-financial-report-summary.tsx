import type { RentalFinancialReportTotalsDto } from "@repo/api-contracts";
import { ChartNoAxesColumnIncreasing, Coins, UsersRound } from "lucide-react";
import { formatExactMoney } from "@/shared/utils/decimal-string";
import {
	type FinancialReportInclusions,
	getFinancialReportAmounts,
} from "./rental-financial-report.utils";

export function RentalFinancialReportSummary({
	totals,
	currency,
	inclusions,
}: {
	totals: RentalFinancialReportTotalsDto;
	currency: string;
	inclusions: FinancialReportInclusions;
}) {
	const amounts = getFinancialReportAmounts(totals, inclusions);
	const cards = [
		{ label: "Total acordado", amount: amounts.agreed, icon: Coins },
		{ label: "De terceros", amount: amounts.thirdParty, icon: UsersRound },
		{
			label: "Para el negocio",
			amount: amounts.retained,
			icon: ChartNoAxesColumnIncreasing,
		},
	];
	return (
		<dl className="grid gap-4 @2xl/finances:grid-cols-3">
			{cards.map((card) => (
				<div
					key={card.label}
					className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-neutral-200/80 bg-card p-4 @2xl/finances:block @2xl/finances:p-5"
				>
					<dt className="flex items-center gap-3 text-xs font-medium text-neutral-600 @2xl/finances:text-sm">
						<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-depiqo-blue-50 text-depiqo-blue-600 @2xl/finances:size-9">
							<card.icon className="size-4.5" aria-hidden="true" />
						</span>
						{card.label}
					</dt>
					<dd
						className={`break-words text-2xl font-semibold tracking-tight tabular-nums @2xl/finances:mt-4 @2xl/finances:text-3xl @4xl/finances:text-4xl ${card.amount.startsWith("-") ? "text-destructive" : "text-neutral-950"}`}
					>
						{formatExactMoney(card.amount, currency)}
					</dd>
				</div>
			))}
		</dl>
	);
}
