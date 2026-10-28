import type {
	GetRentalFinancialReportResponseDto,
	RentalFinancialReportTotalsDto,
} from "@repo/api-contracts";
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { useId } from "react";
import { formatExactMoney } from "@/shared/utils/decimal-string";
import {
	type FinancialReportPeriod,
	type FinancialReportSelection,
	financialReportMonthNames,
	getFinancialReportAmounts,
} from "./rental-financial-report.utils";

export function RentalFinancialReportTable({
	report,
	selection,
	onPeriodChange,
}: {
	report: GetRentalFinancialReportResponseDto;
	selection: FinancialReportSelection;
	onPeriodChange: (period: FinancialReportPeriod) => void;
}) {
	const titleId = useId();
	return (
		<section
			aria-labelledby={titleId}
			className="min-w-0 rounded-lg border border-neutral-200/80 bg-card p-4 @4xl/finances:p-5"
		>
			<h2 id={titleId} className="mb-4 text-sm font-semibold text-neutral-900">
				Detalle mensual<span className="sr-only"> · {report.year}</span>
			</h2>
			<div className="overflow-hidden rounded-md border border-neutral-200/80">
				<Table className="text-xs [&_td]:px-3 [&_td]:py-1 [&_th]:px-3 [&_th]:text-xs [&_th]:font-medium [&_th]:text-neutral-500">
					<TableHeader className="bg-neutral-50/80">
						<TableRow>
							<TableHead className="pl-5">Mes</TableHead>
							<TableHead className="text-right">Alquileres</TableHead>
							<TableHead className="text-right">Equipos</TableHead>
							<TableHead className="text-right">
								Seguro
								{!selection.includeInsurance && (
									<span className="block text-xs font-normal text-muted-foreground">
										Excluido del total
									</span>
								)}
							</TableHead>
							<TableHead className="text-right">
								Entrega
								{!selection.includeDelivery && (
									<span className="block text-xs font-normal text-muted-foreground">
										Excluida del total
									</span>
								)}
							</TableHead>
							<TableHead className="text-right">Total acordado</TableHead>
							<TableHead className="text-right">De terceros</TableHead>
							<TableHead className="pr-5 text-right">Para el negocio</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{report.periods.map((period, index) => {
							const month = String(index + 1) as FinancialReportPeriod;
							return (
								<TableRow
									key={period.from}
									data-state={
										selection.period === month ? "selected" : undefined
									}
									className="data-[state=selected]:bg-depiqo-blue-50 data-[state=selected]:text-depiqo-blue-600 data-[state=selected]:hover:bg-depiqo-blue-100/70 data-[state=selected]:[&_td]:font-semibold"
								>
									<TableCell className="pl-5">
										<button
											type="button"
											aria-pressed={selection.period === month}
											onClick={() => onPeriodChange(month)}
											className="min-h-7 rounded-sm font-medium hover:text-depiqo-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-depiqo-blue-500 pointer-coarse:min-h-11"
										>
											{financialReportMonthNames[index]}
										</button>
									</TableCell>
									<AmountCells
										totals={period}
										currency={report.currency}
										selection={selection}
									/>
								</TableRow>
							);
						})}
					</TableBody>
					<TableFooter className="bg-neutral-50/80">
						<TableRow>
							<TableCell className="pl-5">
								<button
									type="button"
									aria-pressed={selection.period === "all"}
									onClick={() => onPeriodChange("all")}
									className="min-h-7 rounded-sm font-semibold hover:text-depiqo-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-depiqo-blue-500 pointer-coarse:min-h-11"
								>
									Total año
								</button>
							</TableCell>
							<AmountCells
								totals={report.totals}
								currency={report.currency}
								selection={selection}
							/>
						</TableRow>
					</TableFooter>
				</Table>
			</div>
		</section>
	);
}

function AmountCells({
	totals,
	currency,
	selection,
}: {
	totals: RentalFinancialReportTotalsDto;
	currency: string;
	selection: FinancialReportSelection;
}) {
	const amounts = getFinancialReportAmounts(totals, selection);
	return (
		<>
			<TableCell className="text-right tabular-nums">
				{totals.rentalCount}
			</TableCell>
			<TableCell className="text-right tabular-nums">
				{formatExactMoney(totals.equipmentAmount, currency)}
			</TableCell>
			<TableCell
				className={`text-right tabular-nums ${!selection.includeInsurance ? "text-muted-foreground" : ""}`}
			>
				{formatExactMoney(totals.insuranceAmount, currency)}
			</TableCell>
			<TableCell
				className={`text-right tabular-nums ${!selection.includeDelivery ? "text-muted-foreground" : ""}`}
			>
				{formatExactMoney(totals.deliveryAmount, currency)}
			</TableCell>
			<TableCell className="text-right font-medium tabular-nums">
				{formatExactMoney(amounts.agreed, currency)}
			</TableCell>
			<TableCell className="text-right tabular-nums">
				{formatExactMoney(amounts.thirdParty, currency)}
			</TableCell>
			<TableCell
				className={`pr-5 text-right font-medium tabular-nums ${amounts.retained.startsWith("-") ? "text-destructive" : ""}`}
			>
				{formatExactMoney(amounts.retained, currency)}
			</TableCell>
		</>
	);
}
