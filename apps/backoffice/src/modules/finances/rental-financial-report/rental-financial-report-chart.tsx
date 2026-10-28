import type { GetRentalFinancialReportResponseDto } from "@repo/api-contracts";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@repo/ui/components/chart";
import { useId } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { formatExactMoney } from "@/shared/utils/decimal-string";
import {
	type FinancialReportInclusions,
	type FinancialReportPeriod,
	financialReportMonthNames,
	getFinancialReportAmounts,
} from "./rental-financial-report.utils";

const chartConfig = {
	equipmentAmount: { label: "Equipos", color: "var(--color-depiqo-blue-600)" },
	insuranceAmount: { label: "Seguro", color: "var(--color-depiqo-blue-300)" },
	deliveryAmount: { label: "Entrega", color: "var(--color-depiqo-blue-100)" },
} satisfies ChartConfig;
type ComponentKey = keyof typeof chartConfig;
const componentKeys: ComponentKey[] = [
	"equipmentAmount",
	"insuranceAmount",
	"deliveryAmount",
];
export function RentalFinancialReportChart({
	report,
	inclusions,
	period: selectedPeriod,
}: {
	report: GetRentalFinancialReportResponseDto;
	inclusions: FinancialReportInclusions;
	period: FinancialReportPeriod;
}) {
	const titleId = useId();
	const axisFormatter = new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: report.currency,
		currencyDisplay: "narrowSymbol",
		notation: "compact",
		minimumFractionDigits: 0,
		maximumFractionDigits: 1,
	});
	const visibleKeys = componentKeys.filter(
		(key) =>
			key === "equipmentAmount" ||
			(key === "insuranceAmount" && inclusions.includeInsurance) ||
			(key === "deliveryAmount" && inclusions.includeDelivery),
	);
	// Numbers determine geometry only. Tooltip values come from the exact DTO.
	const data = report.periods.map((period, index) => ({
		month: financialReportMonthNames[index],
		equipmentAmount: Number(period.equipmentAmount),
		insuranceAmount: inclusions.includeInsurance
			? Number(period.insuranceAmount)
			: 0,
		deliveryAmount: inclusions.includeDelivery
			? Number(period.deliveryAmount)
			: 0,
	}));
	const total = Number(
		getFinancialReportAmounts(report.totals, inclusions).agreed,
	);
	const canPlot = Number.isFinite(total);
	return (
		<section
			aria-labelledby={titleId}
			className="min-w-0 rounded-lg border border-neutral-200/80 bg-card p-4 @4xl/finances:p-5"
		>
			<h2 id={titleId} className="text-sm font-semibold text-neutral-900">
				Evolución mensual
				<span className="sr-only">
					{" "}
					· {report.year}, total acordado por mes de inicio en {report.currency}
				</span>
			</h2>
			{!canPlot || total === 0 ? (
				<div className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">
					{canPlot
						? "No hay importes incluidos para graficar en este año."
						: "Consulta los importes exactos en el detalle mensual."}
				</div>
			) : (
				<ChartContainer
					config={chartConfig}
					className="mt-4 h-72 w-full aspect-auto"
				>
					<BarChart
						data={data}
						accessibilityLayer
						margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
						barCategoryGap="30%"
					>
						<CartesianGrid stroke="var(--color-neutral-100)" />
						<XAxis
							dataKey="month"
							axisLine={false}
							tickLine={false}
							tickMargin={8}
							tickFormatter={(value: string) => value.slice(0, 3)}
							tick={{ fontSize: 10 }}
							interval={0}
						/>
						<YAxis
							axisLine={false}
							tickLine={false}
							width={56}
							tick={{ fontSize: 10 }}
							tickFormatter={(value: number) => axisFormatter.format(value)}
						/>
						<ChartTooltip
							content={({ active, label, payload }) => {
								const period =
									report.periods[
										financialReportMonthNames.indexOf(String(label))
									];
								if (!period) return null;
								return (
									<ChartTooltipContent
										active={active}
										label={label}
										payload={payload}
										labelFormatter={() => (
											<div className="space-y-1">
												<p className="text-[10px] text-neutral-500">
													{label} {report.year}
												</p>
												<p className="text-base font-semibold text-neutral-950 tabular-nums">
													{formatExactMoney(
														getFinancialReportAmounts(period, inclusions)
															.agreed,
														report.currency,
													)}
												</p>
											</div>
										)}
										className="min-w-48 border-neutral-200 bg-white p-3 shadow-md"
										formatter={(_value, _name, item) => {
											const key = visibleKeys.find(
												(candidate) => candidate === item.dataKey,
											);
											if (!key) return null;
											return (
												<>
													<span
														className="size-2.5 shrink-0 rounded-xs"
														style={{ backgroundColor: item.color }}
													/>
													<div className="flex flex-1 justify-between gap-5">
														<span className="text-muted-foreground">
															{chartConfig[key].label}
														</span>
														<span className="font-medium tabular-nums">
															{formatExactMoney(period[key], report.currency)}
														</span>
													</div>
												</>
											);
										}}
									/>
								);
							}}
						/>
						<ChartLegend
							itemSorter={(item) =>
								componentKeys.findIndex((key) => key === item.dataKey)
							}
							content={
								<ChartLegendContent className="flex-wrap text-[10px] text-neutral-500" />
							}
						/>
						{visibleKeys.map((key, index) => (
							<Bar
								key={key}
								dataKey={key}
								fill={`var(--color-${key})`}
								stackId="agreed"
								maxBarSize={42}
								isAnimationActive={false}
								radius={index === visibleKeys.length - 1 ? [3, 3, 0, 0] : 0}
							>
								{report.periods.map((month, monthIndex) => (
									<Cell
										key={month.from}
										fillOpacity={
											selectedPeriod === "all" ||
											selectedPeriod === String(monthIndex + 1)
												? 1
												: 0.55
										}
									/>
								))}
							</Bar>
						))}
					</BarChart>
				</ChartContainer>
			)}
		</section>
	);
}
